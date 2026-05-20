// ============================================================
// AI API Relay — Usage Tracking + Rate Limiting (Vercel KV)
// ============================================================

import type { UsageRecord, DailyUsagePoint, ProviderDailyUsage } from './types';

/**
 * Try to get the KV client. Returns null if KV is not configured
 * (e.g., local dev without KV). Graceful degradation.
 */
async function getKV() {
  // Check env vars BEFORE importing — @vercel/kv throws on init if missing
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch {
    return null;
  }
}

/**
 * Get today's date string in YYYY-MM-DD format.
 */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Get current month string in YYYY-MM format.
 */
function thisMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

// ── Rate Limiting ──────────────────────────────────────────

export interface QuotaConfig {
  dailyLimit: number;   // max requests per day (0 = unlimited)
  monthlyLimit: number; // max requests per month (0 = unlimited)
}

export interface QuotaStatus {
  allowed: boolean;
  dailyUsed: number;
  dailyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
  retryAfter?: number;  // seconds until next available slot
}

/**
 * Read quota config from environment variables.
 * RELAY_DAILY_LIMIT and RELAY_MONTHLY_LIMIT (0 or unset = unlimited).
 */
function getQuotaConfig(): QuotaConfig {
  return {
    dailyLimit: parseInt(process.env.RELAY_DAILY_LIMIT || '0', 10) || 0,
    monthlyLimit: parseInt(process.env.RELAY_MONTHLY_LIMIT || '0', 10) || 0,
  };
}

/**
 * Check whether a request is within quota limits.
 * Returns { allowed: true } if OK, or { allowed: false, retryAfter } if over limit.
 */
export async function checkQuota(): Promise<QuotaStatus> {
  const config = getQuotaConfig();
  const kv = await getKV();

  // If no KV or no limits set, always allow
  if (!kv || (!config.dailyLimit && !config.monthlyLimit)) {
    return {
      allowed: true,
      dailyUsed: 0,
      dailyLimit: config.dailyLimit,
      monthlyUsed: 0,
      monthlyLimit: config.monthlyLimit,
    };
  }

  const date = today();
  const month = thisMonth();

  const dailyKey = `quota:daily:${date}`;
  const monthlyKey = `quota:monthly:${month}`;

  const [dailyUsed, monthlyUsed] = await Promise.all([
    kv.get<number>(dailyKey).then((v) => v || 0),
    kv.get<number>(monthlyKey).then((v) => v || 0),
  ]);

  // Check daily limit
  if (config.dailyLimit > 0 && dailyUsed >= config.dailyLimit) {
    // Seconds until midnight UTC
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    const retryAfter = Math.ceil((midnight.getTime() - now.getTime()) / 1000);
    return {
      allowed: false,
      dailyUsed,
      dailyLimit: config.dailyLimit,
      monthlyUsed,
      monthlyLimit: config.monthlyLimit,
      retryAfter,
    };
  }

  // Check monthly limit
  if (config.monthlyLimit > 0 && monthlyUsed >= config.monthlyLimit) {
    // Seconds until first of next month UTC
    const now = new Date();
    const nextMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
    const retryAfter = Math.ceil((nextMonth.getTime() - now.getTime()) / 1000);
    return {
      allowed: false,
      dailyUsed,
      dailyLimit: config.dailyLimit,
      monthlyUsed,
      monthlyLimit: config.monthlyLimit,
      retryAfter,
    };
  }

  return {
    allowed: true,
    dailyUsed,
    dailyLimit: config.dailyLimit,
    monthlyUsed,
    monthlyLimit: config.monthlyLimit,
  };
}

/**
 * Increment the quota counters after a successful request.
 */
async function incrementQuota(): Promise<void> {
  try {
    const kv = await getKV();
    if (!kv) return;

    const date = today();
    const month = thisMonth();

    const dailyKey = `quota:daily:${date}`;
    const monthlyKey = `quota:monthly:${month}`;

    await Promise.all([
      kv.incr(dailyKey).then(() => kv.expire(dailyKey, 86400 * 2)),
      kv.incr(monthlyKey).then(() => kv.expire(monthlyKey, 86400 * 35)),
    ]);
  } catch {
    // Non-critical
  }
}

// ── Usage Tracking ─────────────────────────────────────────

/**
 * Record a completed request's usage.
 * Called asynchronously — failures are silently ignored (non-critical path).
 */
export async function recordUsage(
  keyHash: string,
  tokens: { prompt: number; completion: number },
  provider?: string
): Promise<void> {
  try {
    const kv = await getKV();
    if (!kv) return; // KV not configured — skip

    const date = today();
    const totalTokens = tokens.prompt + tokens.completion;

    // Per-key daily usage
    const keyDailyKey = `usage:${keyHash}:daily:${date}`;
    await kv.hincrby(keyDailyKey, 'requests', 1);
    await kv.hincrby(keyDailyKey, 'tokens', totalTokens);
    await kv.expire(keyDailyKey, 86400 * 7); // 7 day TTL

    // Per-key total usage
    const keyTotalKey = `usage:${keyHash}:total`;
    await kv.hincrby(keyTotalKey, 'requests', 1);
    await kv.hincrby(keyTotalKey, 'tokens', totalTokens);

    // Global daily usage (with prompt/completion split)
    const globalDailyKey = `usage:daily:${date}`;
    await kv.hincrby(globalDailyKey, 'requests', 1);
    await kv.hincrby(globalDailyKey, 'tokens', totalTokens);
    await kv.hincrby(globalDailyKey, 'promptTokens', tokens.prompt);
    await kv.hincrby(globalDailyKey, 'completionTokens', tokens.completion);
    await kv.expire(globalDailyKey, 86400 * 30); // 30 day TTL

    // Per-provider daily usage (with prompt/completion split)
    if (provider) {
      const providerDailyKey = `usage:provider:${provider}:daily:${date}`;
      await kv.hincrby(providerDailyKey, 'requests', 1);
      await kv.hincrby(providerDailyKey, 'tokens', totalTokens);
      await kv.hincrby(providerDailyKey, 'promptTokens', tokens.prompt);
      await kv.hincrby(providerDailyKey, 'completionTokens', tokens.completion);
      await kv.expire(providerDailyKey, 86400 * 30); // 30 day TTL
    }

    // Increment quota counters
    await incrementQuota();
  } catch {
    // Usage tracking is non-critical — never break the request
  }
}

/**
 * Get usage stats for a specific key.
 */
export async function getKeyUsage(keyHash: string): Promise<{
  daily: UsageRecord;
  total: UsageRecord;
} | null> {
  try {
    const kv = await getKV();
    if (!kv) return null;

    const date = today();
    const dailyRaw = await kv.hgetall(`usage:${keyHash}:daily:${date}`);
    const totalRaw = await kv.hgetall(`usage:${keyHash}:total`);

    return {
      daily: {
        requests: Number(dailyRaw?.requests || 0),
        tokens: Number(dailyRaw?.tokens || 0),
        lastUsed: Date.now(),
      },
      total: {
        requests: Number(totalRaw?.requests || 0),
        tokens: Number(totalRaw?.tokens || 0),
        lastUsed: Date.now(),
      },
    };
  } catch {
    return null;
  }
}

/**
 * Get global daily usage stats.
 */
export async function getGlobalUsage(): Promise<UsageRecord | null> {
  try {
    const kv = await getKV();
    if (!kv) return null;

    const date = today();
    const raw = await kv.hgetall(`usage:daily:${date}`);

    return {
      requests: Number(raw?.requests || 0),
      tokens: Number(raw?.tokens || 0),
      lastUsed: Date.now(),
    };
  } catch {
    return null;
  }
}

// ── Usage Trend Queries ─────────────────────────────────────

/** Known provider names for trend queries */
const PROVIDER_NAMES = ['openai', 'anthropic', 'deepseek', 'xiaomi'];

/**
 * Generate an array of date strings (YYYY-MM-DD) going back N days from today.
 */
function dateRange(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * Get the ISO week label for a date string (YYYY-MM-DD).
 * Returns "YYYY-Www" format (e.g., "2026-W21").
 */
function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  // ISO week: Thursday determines the week year
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + 1;
  const weekNum = Math.ceil((dayOfYear + jan4.getDay()) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Get the month label for a date string (YYYY-MM-DD).
 * Returns "YYYY-MM" format.
 */
function getMonthLabel(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/**
 * Aggregate daily usage points into weekly or monthly buckets.
 */
function aggregatePoints(points: DailyUsagePoint[], labelFn: (date: string) => string): DailyUsagePoint[] {
  const buckets = new Map<string, DailyUsagePoint>();

  for (const p of points) {
    const label = labelFn(p.date);
    const existing = buckets.get(label);
    if (existing) {
      existing.requests += p.requests;
      existing.promptTokens += p.promptTokens;
      existing.completionTokens += p.completionTokens;
      existing.totalTokens += p.totalTokens;
    } else {
      buckets.set(label, {
        date: label,
        requests: p.requests,
        promptTokens: p.promptTokens,
        completionTokens: p.completionTokens,
        totalTokens: p.totalTokens,
      });
    }
  }

  return Array.from(buckets.values());
}

/**
 * Parse a KV hash into a DailyUsagePoint for a given date.
 */
function parseDailyPoint(date: string, raw: Record<string, unknown> | null): DailyUsagePoint {
  return {
    date,
    requests: Number(raw?.requests || 0),
    promptTokens: Number(raw?.promptTokens || 0),
    completionTokens: Number(raw?.completionTokens || 0),
    totalTokens: Number(raw?.tokens || 0),
  };
}

/**
 * Get usage trend data for the admin dashboard.
 * Supports day/week/month granularity with aggregated views.
 *
 * For week/month, we fetch daily KV data and aggregate server-side.
 */
export async function getUsageTrend(
  range: string,
  granularity: 'day' | 'week' | 'month' = 'day'
): Promise<{ global: DailyUsagePoint[]; providers: ProviderDailyUsage[] }> {
  const kv = await getKV();
  if (!kv) {
    return { global: [], providers: [] };
  }

  // Determine how many days to fetch based on range + granularity
  // For day: range = "7d"/"30d" → 7/30 days
  // For week: range = "4w"/"12w" → 28/84 days
  // For month: range = "6m"/"12m" → 180/365 days
  let days: number;
  if (granularity === 'day') {
    days = range === '30d' ? 30 : 7;
  } else if (granularity === 'week') {
    days = range === '12w' ? 84 : 28;
  } else {
    days = range === '12m' ? 365 : 180;
  }

  const dates = dateRange(days);

  // Fetch global daily data for all dates in parallel
  const globalPromises = dates.map(async (date) => {
    const raw = await kv.hgetall(`usage:daily:${date}`);
    return parseDailyPoint(date, raw as Record<string, unknown> | null);
  });

  // Fetch per-provider daily data for all dates
  const providerPromises = PROVIDER_NAMES.map(async (provider) => {
    const dataPromises = dates.map(async (date) => {
      const raw = await kv.hgetall(`usage:provider:${provider}:daily:${date}`);
      return parseDailyPoint(date, raw as Record<string, unknown> | null);
    });
    const data = await Promise.all(dataPromises);
    return { provider, data };
  });

  const [globalDaily, providersDaily] = await Promise.all([
    Promise.all(globalPromises),
    Promise.all(providerPromises),
  ]);

  // Aggregate if needed
  if (granularity === 'day') {
    // No aggregation — return as-is
    const activeProviders = providersDaily.filter((p) =>
      p.data.some((d) => d.totalTokens > 0)
    );
    return { global: globalDaily, providers: activeProviders };
  }

  const labelFn = granularity === 'week' ? getWeekLabel : getMonthLabel;

  const global = aggregatePoints(globalDaily, labelFn);
  const providers = providersDaily
    .map((p) => ({
      provider: p.provider,
      data: aggregatePoints(p.data, labelFn),
    }))
    .filter((p) => p.data.some((d) => d.totalTokens > 0));

  return { global, providers };
}

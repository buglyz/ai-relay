// ============================================================
// AI API Relay — Type Definitions
// ============================================================

/** Supported AI providers */
export type ProviderName = 'openai' | 'anthropic' | 'deepseek' | 'xiaomi';

/** Provider configuration */
export interface ProviderConfig {
  name: ProviderName;
  displayName: string;
  baseUrl: string;
  modelPrefixes: string[];
  headerFormat: 'openai' | 'anthropic';
  envKeyField: string;           // env var name for API keys
  envBaseUrlField?: string;      // env var name for custom base URL
}

/** A single API key with metadata */
export interface ApiKey {
  key: string;
  hash: string;                  // short hash for KV storage
  provider: ProviderName;
}

/** Key pool for a provider */
export interface KeyPool {
  provider: ProviderName;
  keys: ApiKey[];
  counter: number;               // round-robin counter
}

/** Usage record stored in KV */
export interface UsageRecord {
  requests: number;
  tokens: number;                // total tokens (prompt + completion)
  promptTokens?: number;         // prompt tokens (for trend data)
  completionTokens?: number;     // completion tokens (for trend data)
  lastUsed: number;              // timestamp
}

/** Daily usage data point for trend charts */
export interface DailyUsagePoint {
  date: string;                  // YYYY-MM-DD
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Per-provider daily usage for trend charts */
export interface ProviderDailyUsage {
  provider: string;
  data: DailyUsagePoint[];
}

/** Time granularity for trend views */
export type Granularity = 'day' | 'week' | 'month';

/** Usage trend API response */
export interface UsageTrendResponse {
  range: string;
  granularity: Granularity;
  global: DailyUsagePoint[];
  providers: ProviderDailyUsage[];
}

/** OpenAI-compatible chat completion request */
export interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    name?: string;
    tool_calls?: unknown[];
    tool_call_id?: string;
  }>;
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  tools?: unknown[];
  tool_choice?: unknown;
  // Allow passthrough of any other params
  [key: string]: unknown;
}

/** OpenAI-compatible chat completion response */
export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: unknown[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Error response in OpenAI format */
export interface ErrorResponse {
  error: {
    message: string;
    type: string;
    code: string | number;
  };
}

// ============================================================
// AI Relay API — Usage Batch Upload
// ============================================================

import { NextRequest } from 'next/server';
import { kv } from '@vercel/kv';
import { hashDeviceToken } from '@/lib/local/device-auth';

export const runtime = 'nodejs';

// POST /api/local/usage/batch - Receive usage from local relay
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return Response.json({ error: 'Missing token' }, { status: 401 });
  }

  // Verify device token
  const tokenHash = await hashDeviceToken(token);
  const devices = await kv.keys('device:*');
  let deviceId: string | null = null;

  for (const key of devices) {
    const device = await kv.hgetall(key);
    if (device && device.token_hash === tokenHash) {
      deviceId = key.replace('device:', '');
      break;
    }
  }

  if (!deviceId) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { events } = await request.json();

  // Store usage events (simplified - just log for MVP)
  console.log(`[Usage] Device ${deviceId} uploaded ${events?.length || 0} events`);

  // Update last heartbeat
  await kv.hset(`device:${deviceId}`, {
    last_heartbeat: Date.now(),
    status: 'online',
  });

  return Response.json({ success: true, received: events?.length || 0 });
}

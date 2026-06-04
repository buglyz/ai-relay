import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

function req(body: unknown) {
  return new NextRequest('http://localhost/api/admin/providers', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer admin-test-key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('admin custom provider management API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('preserves custom User-Agent when saving a provider', async () => {
    const saveCustomProvider = vi.fn(async () => undefined);
    vi.doMock('@/lib/admin', () => ({
      requireAdminAuth: vi.fn(() => null),
      saveCustomProvider,
      deleteCustomProvider: vi.fn(),
    }));
    vi.doMock('@/lib/providers', () => ({
      clearProvidersCache: vi.fn(),
    }));

    const { POST } = await import('../app/api/admin/providers/route');
    const res = await POST(req({
      name: 'custom_newapi',
      displayName: 'Custom NewAPI',
      baseUrl: 'https://example.com/v1',
      headerFormat: 'openai',
      modelPrefixes: ['deepseek-'],
      userAgent: ' Mozilla/5.0 ',
      models: [],
    }));

    expect(res.status).toBe(200);
    expect(saveCustomProvider).toHaveBeenCalledWith(expect.objectContaining({
      name: 'custom_newapi',
      userAgent: 'Mozilla/5.0',
    }));
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      provider: {
        name: 'custom_newapi',
        userAgent: 'Mozilla/5.0',
      },
    });
  });
});

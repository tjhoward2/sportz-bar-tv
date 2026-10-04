import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

describe('GET /api/health', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns ok and is never cached', async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = (await res.json()) as { status: string; commit: string; time: string };
    expect(body.status).toBe('ok');
    expect(Number.isNaN(Date.parse(body.time))).toBe(false);
  });

  it('reports the short commit SHA on Vercel', async () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'abcdef1234567890');
    const body = (await GET().json()) as { commit: string };
    expect(body.commit).toBe('abcdef1');
  });
});

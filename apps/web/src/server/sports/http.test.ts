import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError, TtlCache, fetchJson, mapLimit } from './http';

const opts = { ttlMs: 1_000, maxStaleMs: 10_000 };

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe('TtlCache', () => {
  it('serves fresh values without reloading', async () => {
    const c = clock();
    const cache = new TtlCache<number>(c.now);
    const load = vi.fn().mockResolvedValue(1);
    await cache.get('k', load, opts);
    c.advance(999);
    expect((await cache.get('k', load, opts)).value).toBe(1);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reloads after the TTL', async () => {
    const c = clock();
    const cache = new TtlCache<number>(c.now);
    const load = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    await cache.get('k', load, opts);
    c.advance(1_000);
    expect((await cache.get('k', load, opts)).value).toBe(2);
  });

  it('serves the last good value, flagged stale, when a refresh fails', async () => {
    const c = clock();
    const cache = new TtlCache<number>(c.now);
    await cache.get('k', async () => 1, opts);
    c.advance(5_000);
    const r = await cache.get('k', async () => Promise.reject(new Error('boom')), opts);
    expect(r).toMatchObject({ value: 1, stale: true, error: 'boom', fetchedAt: 0 });
  });

  it('gives up on stale data past maxStaleMs', async () => {
    const c = clock();
    const cache = new TtlCache<number>(c.now);
    await cache.get('k', async () => 1, opts);
    c.advance(10_001);
    await expect(
      cache.get('k', async () => Promise.reject(new Error('boom')), opts),
    ).rejects.toThrow('boom');
  });

  it('shares one in-flight load between concurrent callers', async () => {
    const cache = new TtlCache<number>();
    const load = vi.fn(() => new Promise<number>((r) => setTimeout(() => r(7), 5)));
    const [a, b] = await Promise.all([cache.get('k', load, opts), cache.get('k', load, opts)]);
    expect(a.value).toBe(7);
    expect(b.value).toBe(7);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('stale-while-revalidate returns the old value immediately', async () => {
    const c = clock();
    const cache = new TtlCache<number>(c.now);
    const swr = { ...opts, staleWhileRevalidate: true };
    await cache.get('k', async () => 1, swr);
    c.advance(2_000);
    let resolve!: (n: number) => void;
    const slow = new Promise<number>((r) => (resolve = r));
    expect((await cache.get('k', () => slow, swr)).value).toBe(1);
    resolve(2);
    await slow;
    await Promise.resolve();
    c.advance(1);
    expect((await cache.get('k', async () => 3, swr)).value).toBe(2);
  });
});

describe('mapLimit', () => {
  it('caps concurrency, keeps order, and captures failures', async () => {
    let active = 0;
    let peak = 0;
    const results = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 2));
      active--;
      if (n === 3) throw new Error('three');
      return n * 10;
    });
    expect(peak).toBe(2);
    expect(results.map((r) => (r.status === 'fulfilled' ? r.value : 'err'))).toEqual([
      10,
      20,
      'err',
      40,
      50,
    ]);
  });

  it('handles an empty list', async () => {
    expect(await mapLimit([], 4, async () => 1)).toEqual([]);
  });
});

describe('fetchJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed JSON and sends a user agent', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"a":1}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchJson('https://x.test/a', 1_000)).toEqual({ a: 1 });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)['user-agent']).toContain('SportzBarTV');
  });

  it('throws HttpError on non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('no', { status: 404 })));
    await expect(fetchJson('https://x.test/a', 1_000)).rejects.toBeInstanceOf(HttpError);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdapterResult } from '@/server/sports';

const fetchAllEvents = vi.fn<() => Promise<AdapterResult>>();
vi.mock('@/server/sports', () => ({ fetchAllEvents: () => fetchAllEvents() }));

const { GET } = await import('./route');

const feed = (league: 'NFL' | 'NBA', ok: boolean, stale = false) => ({
  league,
  ok,
  stale,
  eventCount: ok ? 3 : 0,
});

describe('GET /api/health/feeds', () => {
  beforeEach(() => fetchAllEvents.mockReset());

  it('is ok when every feed loads', async () => {
    fetchAllEvents.mockResolvedValue({ events: [], feeds: [feed('NFL', true), feed('NBA', true)] });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok', failing: [], stale: [] });
  });

  it('is degraded when some feeds fail or are stale', async () => {
    fetchAllEvents.mockResolvedValue({
      events: [],
      feeds: [feed('NFL', false), feed('NBA', true, true)],
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      status: 'degraded',
      failing: ['NFL'],
      stale: ['NBA'],
    });
  });

  it('is down (503) when every feed fails', async () => {
    fetchAllEvents.mockResolvedValue({
      events: [],
      feeds: [feed('NFL', false), feed('NBA', false)],
    });
    const res = await GET();
    expect(res.status).toBe(503);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});

import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearEspnCache, fetchEspnEvents, planRequests } from './adapter';
import { ESPN_ENDPOINTS } from './endpoints';

const NOW = new Date('2026-10-04T18:00:00Z');
const golf = readFileSync(new URL('./__fixtures__/golf-tournament.json', import.meta.url), 'utf8');
const nfl = readFileSync(new URL('./__fixtures__/nfl-scheduled.json', import.meta.url), 'utf8');
const ep = (league: string) => ESPN_ENDPOINTS.filter((e) => e.league === league);

describe('planRequests', () => {
  it('fetches yesterday→+2 for regular leagues and yesterday→+6 for championships', () => {
    expect(planRequests(NOW, ep('NFL')).map((r) => r.day)).toEqual([
      '20261003',
      '20261004',
      '20261005',
      '20261006',
    ]);
    expect(planRequests(NOW, ep('FIFA_WORLD_CUP'))).toHaveLength(8);
  });

  it('marks only days after today as future', () => {
    expect(planRequests(NOW, ep('NFL')).map((r) => r.isFuture)).toEqual([false, false, true, true]);
  });
});

describe('fetchEspnEvents', () => {
  beforeEach(() => clearEspnCache());
  afterEach(() => vi.unstubAllGlobals());

  it('requests one day per call and dedupes events seen on several days', async () => {
    const fetchMock = vi.fn(async () => new Response(golf, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { events, feeds } = await fetchEspnEvents(NOW, ep('PGA'));
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toMatch(
      /golf\/pga\/scoreboard\?dates=\d{8}$/,
    );
    expect(events).toHaveLength(1);
    expect(feeds).toEqual([
      expect.objectContaining({ league: 'PGA', ok: true, stale: false, eventCount: 1 }),
    ]);
  });

  it('fails open: one broken league is reported, others still load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('/golf/') ? new Response('bad', { status: 400 }) : new Response(nfl),
      ),
    );
    const { events, feeds } = await fetchEspnEvents(NOW, [...ep('PGA'), ...ep('NFL')]);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.league === 'NFL')).toBe(true);
    const pga = feeds.find((f) => f.league === 'PGA');
    expect(pga).toMatchObject({ ok: false, eventCount: 0 });
    expect(pga?.error).toContain('HTTP 400');
    expect(feeds.find((f) => f.league === 'NFL')?.ok).toBe(true);
  });

  it('serves cached data flagged stale when ESPN starts failing', async () => {
    // The cache ages entries by wall clock, so move the clock past the 30s TTL.
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(nfl)),
    );
    await fetchEspnEvents(NOW, ep('NFL'));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('down', { status: 503 })),
    );
    vi.setSystemTime(NOW.getTime() + 60_000);
    const { events, feeds } = await fetchEspnEvents(new Date(), ep('NFL'));
    vi.useRealTimers();
    expect(events.length).toBeGreaterThan(0);
    expect(feeds[0]).toMatchObject({ ok: true, stale: true });
    expect(feeds[0]?.error).toContain('HTTP 503');
  });
});

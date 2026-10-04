import type { SportsEvent } from '@sbtv/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdapterResult } from '@/server/sports';
import { call, cookieFrom, resetDb } from '../../../../test/helpers';

const fetchAllEvents = vi.fn<() => Promise<AdapterResult>>();
vi.mock('@/server/sports', () => ({ fetchAllEvents: () => fetchAllEvents() }));

const { GET: list } = await import('./route');
const { GET: detail } = await import('./[id]/route');
const { GET: scores } = await import('../scores/route');
const { POST: signup } = await import('../auth/signup/route');
const { PUT: putSettings } = await import('../user/settings/route');

const minutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
function event(id: string, over: Partial<SportsEvent> = {}): SportsEvent {
  return {
    id,
    source: 'ESPN',
    sport: 'BASKETBALL',
    league: 'NBA',
    shape: 'TEAM',
    name: id,
    startTime: minutes(60),
    rawStatus: 'SCHEDULED',
    statusDetail: '',
    competitors: [
      { id: 'a', name: 'Utah Jazz', shortName: 'Jazz' },
      { id: 'h', name: 'Portland Trail Blazers', shortName: 'Blazers', isHome: true },
    ],
    broadcasts: [{ name: 'ESPN', market: 'NATIONAL' }],
    tags: [],
    ...over,
  };
}

let cookie = '';
beforeEach(async () => {
  await resetDb();
  fetchAllEvents.mockReset();
  fetchAllEvents.mockResolvedValue({
    events: [
      event('espn:NBA:1', { rawStatus: 'LIVE', startTime: minutes(-30) }),
      event('espn:NBA:2'),
      event('espn:NHL:3', {
        sport: 'HOCKEY',
        league: 'NHL',
        rawStatus: 'FINAL',
        startTime: minutes(-200),
      }),
    ],
    feeds: [
      { league: 'NBA', ok: true, stale: false, eventCount: 2 },
      { league: 'NHL', ok: true, stale: true, eventCount: 1 },
      { league: 'MLB', ok: false, stale: false, eventCount: 0 },
    ],
  });
  const { res } = await call(signup, '/api/auth/signup', {
    body: {
      email: 'sam@example.com',
      password: 'correct horse battery',
      firstName: 'S',
      lastName: 'B',
    },
  });
  cookie = cookieFrom(res);
  await call(putSettings, '/api/user/settings', {
    method: 'PUT',
    cookie,
    body: {
      providers: [{ provider: 'DIRECTV', isPrimary: true }],
      subscriptions: [],
      zip: '97201',
      timezone: 'America/Los_Angeles',
      favoriteTeams: ['Trail Blazers'],
    },
  });
});

describe('GET /api/events', () => {
  it('returns the ranked dashboard resolved against the user setup', async () => {
    const { res, json } = await call(list, '/api/events', { method: 'GET', cookie });
    expect(res.status).toBe(200);
    expect(json.items.map((i: { event: { id: string } }) => i.event.id)).toEqual([
      'espn:NBA:1',
      'espn:NBA:2',
    ]);
    expect(json.items[0]).toMatchObject({ status: 'LIVE', isFavorite: true, isAvailable: true });
    expect(json.items[0].chips.chips[0]).toMatchObject({
      providerLabel: 'DIRECTV',
      channel: '206',
    });
    expect(json.feeds).toEqual({ failing: ['MLB'], stale: ['NHL'] });
  });

  it('applies query filters and rejects bad ones', async () => {
    const live = await call(list, '/api/events?status=LIVE', { method: 'GET', cookie });
    expect(live.json.items).toHaveLength(1);
    const bad = await call(list, '/api/events?sport=CURLING', { method: 'GET', cookie });
    expect(bad.res.status).toBe(400);
  });

  it('requires sign-in', async () => {
    expect((await call(list, '/api/events', { method: 'GET' })).res.status).toBe(401);
  });
});

describe('GET /api/events/[id]', () => {
  it('returns one game with all broadcasts', async () => {
    const { res, json } = await call(
      detail,
      '/api/events/x',
      { method: 'GET', cookie },
      {
        params: Promise.resolve({ id: encodeURIComponent('espn:NBA:2') }),
      },
    );
    expect(res.status).toBe(200);
    expect(json.item.event.id).toBe('espn:NBA:2');
    expect(json.item.broadcasts[0]).toMatchObject({ state: 'HAVE', channel: '206' });
  });

  it('404s for unknown games', async () => {
    const { res } = await call(
      detail,
      '/api/events/x',
      { method: 'GET', cookie },
      {
        params: Promise.resolve({ id: 'espn:NBA:999' }),
      },
    );
    expect(res.status).toBe(404);
  });
});

describe('GET /api/scores', () => {
  it('groups games into sections, finals included', async () => {
    const { res, json } = await call(scores, '/api/scores', { method: 'GET', cookie });
    expect(res.status).toBe(200);
    expect(json.sections.liveNow).toHaveLength(1);
    expect(json.sections.justEnded.map((i: { event: { id: string } }) => i.event.id)).toEqual([
      'espn:NHL:3',
    ]);
  });
});

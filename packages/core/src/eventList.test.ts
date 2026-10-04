import { describe, expect, it } from 'vitest';
import {
  buildDashboard,
  buildScores,
  compareItems,
  isFavoriteEvent,
  toListItem,
  type UserListConfig,
} from './eventList';
import type { SportsEvent } from './events';

const NOW = new Date('2026-10-04T19:00:00Z'); // noon in Portland
const min = (m: number) => new Date(NOW.getTime() + m * 60_000).toISOString();

let seq = 0;
function ev(
  over: Partial<SportsEvent> & { minutes?: number; teams?: [string, string] } = {},
): SportsEvent {
  const { minutes = 60, teams = ['Away Team', 'Home Team'], ...rest } = over;
  seq++;
  return {
    id: `t:${seq}`,
    source: 'ESPN',
    sport: 'BASKETBALL',
    league: 'NBA',
    shape: 'TEAM',
    name: `${teams[0]} at ${teams[1]}`,
    startTime: min(minutes),
    rawStatus: 'SCHEDULED',
    statusDetail: '',
    competitors: [
      { id: 'a', name: teams[0], shortName: teams[0] },
      { id: 'h', name: teams[1], shortName: teams[1], isHome: true },
    ],
    broadcasts: [{ name: 'ESPN', market: 'NATIONAL' }],
    tags: [],
    ...rest,
  };
}

const config: UserListConfig = {
  providers: [{ provider: 'DIRECTV', isPrimary: true }],
  subscriptions: [],
  zip: '97201',
  favoriteTeams: ['Trail Blazers'],
  timezone: 'America/Los_Angeles',
};

describe('isFavoriteEvent', () => {
  it('matches team-name substrings, case-insensitively', () => {
    const e = ev({ teams: ['Portland Trail Blazers', 'Utah Jazz'] });
    expect(isFavoriteEvent(e, ['trail blazers'])).toBe(true);
    expect(isFavoriteEvent(e, ['Seahawks'])).toBe(false);
    expect(isFavoriteEvent(e, [])).toBe(false);
    expect(isFavoriteEvent(e, [' ', 'a'])).toBe(false); // too short to mean anything
  });
});

describe('toListItem', () => {
  it('attaches status, broadcasts and chips', () => {
    const item = toListItem(ev({ minutes: -30, rawStatus: 'LIVE' }), config, NOW);
    expect(item.status).toBe('LIVE');
    expect(item.isAvailable).toBe(true);
    expect(item.chips.chips[0]).toMatchObject({ provider: 'DIRECTV', channel: '206' });
  });
});

describe('buildDashboard', () => {
  it('ranks by status, then favorite, then availability, then start time', () => {
    const upcomingLater = ev({ minutes: 120 });
    const upcomingSoonish = ev({ minutes: 60 });
    const live = ev({ minutes: -20, rawStatus: 'LIVE' });
    const liveFavorite = ev({
      minutes: -10,
      rawStatus: 'LIVE',
      teams: ['Portland Trail Blazers', 'X'],
    });
    const liveUnavailable = ev({
      minutes: -30,
      rawStatus: 'LIVE',
      broadcasts: [{ name: 'Peacock' }],
    });
    const halftime = ev({ minutes: -60, rawStatus: 'HALFTIME' });
    const items = buildDashboard(
      [upcomingLater, live, halftime, upcomingSoonish, liveUnavailable, liveFavorite],
      config,
      NOW,
    );
    expect(items.map((i) => i.event.id)).toEqual([
      liveFavorite.id,
      live.id,
      liveUnavailable.id,
      halftime.id,
      upcomingSoonish.id,
      upcomingLater.id,
    ]);
  });

  it('drops finished games and games with no broadcast', () => {
    const items = buildDashboard(
      [ev({ minutes: -100, rawStatus: 'FINAL' }), ev({ broadcasts: [] }), ev()],
      config,
      NOW,
    );
    expect(items).toHaveLength(1);
  });

  it('caps upcoming at 48h, but gives championship leagues 7 days', () => {
    const in3days = 72 * 60;
    const items = buildDashboard(
      [
        ev({ minutes: in3days }),
        ev({ minutes: in3days, sport: 'SOCCER', league: 'FIFA_WORLD_CUP' }),
        ev({ minutes: 47 * 60 }),
      ],
      config,
      NOW,
    );
    expect(items.map((i) => i.event.league)).toEqual(['NBA', 'FIFA_WORLD_CUP']);
    expect(
      buildDashboard([ev({ minutes: 10 * 60 })], config, NOW, { windowHours: 8 }),
    ).toHaveLength(0);
  });

  it('applies sport, league, status and availability filters', () => {
    const events = [
      ev({ minutes: -10, rawStatus: 'LIVE' }),
      ev({ minutes: 30, sport: 'HOCKEY', league: 'NHL' }),
      ev({ minutes: 60, broadcasts: [{ name: 'Peacock' }] }),
    ];
    expect(buildDashboard(events, config, NOW, { sport: 'HOCKEY' })).toHaveLength(1);
    expect(buildDashboard(events, config, NOW, { league: 'NBA' })).toHaveLength(2);
    expect(buildDashboard(events, config, NOW, { status: 'LIVE' })).toHaveLength(1);
    expect(buildDashboard(events, config, NOW, { status: 'UPCOMING' })).toHaveLength(2);
    expect(buildDashboard(events, config, NOW, { availability: 'AVAILABLE' })).toHaveLength(2);
  });
});

describe('buildScores', () => {
  it('sorts events into the five sections', () => {
    const live = ev({ minutes: -30, rawStatus: 'LIVE' });
    const ended = ev({ minutes: -300, rawStatus: 'FINAL' });
    const endedLongAgo = ev({ minutes: -20 * 60, rawStatus: 'FINAL' });
    const soon = ev({ minutes: 10 });
    const laterToday = ev({ minutes: 6 * 60 }); // 6pm Portland
    const tomorrow = ev({ minutes: 14 * 60 }); // 2am Portland tomorrow
    const postponed = ev({ minutes: -60, rawStatus: 'POSTPONED' });
    const s = buildScores(
      [live, ended, endedLongAgo, soon, laterToday, tomorrow, postponed],
      config,
      NOW,
    );
    expect(s.liveNow.map((i) => i.event.id)).toEqual([live.id]);
    expect(s.justEnded.map((i) => i.event.id)).toEqual([ended.id]);
    expect(s.startingSoon.map((i) => i.event.id)).toEqual([soon.id]);
    expect(s.upcomingToday.map((i) => i.event.id)).toEqual([laterToday.id]);
    expect(s.postponed.map((i) => i.event.id)).toEqual([postponed.id]);
  });

  it('lists the most recent finals first and keeps games without broadcasts', () => {
    const a = ev({ minutes: -200, rawStatus: 'FINAL', broadcasts: [] });
    const b = ev({ minutes: -100, rawStatus: 'FINAL' });
    expect(buildScores([a, b], config, NOW).justEnded.map((i) => i.event.id)).toEqual([b.id, a.id]);
  });
});

describe('compareItems', () => {
  it('breaks full ties by name for a stable order', () => {
    const a = toListItem(ev({ name: 'B game' }), config, NOW);
    const b = toListItem({ ...ev({ name: 'A game' }), startTime: a.event.startTime }, config, NOW);
    expect([a, b].sort(compareItems).map((i) => i.event.name)).toEqual(['A game', 'B game']);
  });
});

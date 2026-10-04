import { readFileSync } from 'node:fs';
import type { LeagueId } from '@sbtv/core';
import { describe, expect, it } from 'vitest';
import { ESPN_ENDPOINTS } from './endpoints';
import { extractBroadcasts, mapEspnStatus, normalizeScoreboard } from './normalize';

// Fixtures are trimmed real ESPN responses captured 2026-10-04.
const NOW = new Date('2026-10-04T02:20:00Z');
const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`./__fixtures__/${name}.json`, import.meta.url), 'utf8'));
const endpoint = (league: LeagueId) => {
  const ep = ESPN_ENDPOINTS.find((e) => e.league === league);
  if (!ep) throw new Error(`no endpoint for ${league}`);
  return ep;
};
const run = (league: LeagueId, name: string) =>
  normalizeScoreboard(endpoint(league), fixture(name), NOW);

describe('team events', () => {
  it('normalizes a scheduled NFL game', () => {
    const { events, invalid } = run('NFL', 'nfl-scheduled');
    expect(invalid).toBe(0);
    expect(events[0]).toMatchObject({
      id: 'espn:NFL:401872965',
      source: 'ESPN',
      sport: 'FOOTBALL',
      league: 'NFL',
      shape: 'TEAM',
      name: 'Colts at Commanders',
      startTime: '2026-10-04T13:30Z',
      rawStatus: 'SCHEDULED',
      statusDetail: '10/4 - 9:30 AM EDT',
      broadcasts: [{ name: 'NFL Net', market: 'NATIONAL' }],
      note: 'NFL London Games',
    });
    const [away, home] = events[0]!.competitors;
    expect(away).toMatchObject({ name: 'Indianapolis Colts', isHome: false, abbreviation: 'IND' });
    expect(home).toMatchObject({ name: 'Washington Commanders', isHome: true, record: '1-2' });
    expect(away?.score).toBeUndefined(); // no "0" before kickoff
  });

  it('keeps scores, period scores and winner for live and final games', () => {
    const { events } = run('NCAAF', 'ncaaf-live-final');
    const live = events.find((e) => e.rawStatus === 'LIVE');
    const final = events.find((e) => e.rawStatus === 'FINAL');
    expect(live).toMatchObject({ name: 'GA Southern at Coastal', statusDetail: '1:51 - 4th' });
    expect(live?.competitors.map((c) => c.score)).toEqual(['31', '17']);
    expect(live?.competitors[0]?.periodScores).toEqual(['10', '7', '0', '14']);
    expect(final?.competitors.find((c) => c.isWinner)?.name).toBe('UTSA Roadrunners');
  });

  it('builds a series note for postseason baseball', () => {
    const { events } = run('MLB', 'mlb-postseason');
    expect(events[0]?.note).toBe('ALDS - Game 1 · CHW lead series 1-0');
  });

  it('keeps regional broadcasts with their market', () => {
    const { events } = run('NHL', 'nhl-regional');
    expect(events[0]?.broadcasts).toEqual([
      { name: 'NHL Net', market: 'NATIONAL' },
      { name: 'DSN', market: 'HOME' },
    ]);
  });
});

describe('special shapes', () => {
  it('golf: one tournament event with the top 5 leaders', () => {
    const { events } = run('PGA', 'golf-tournament');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: 'espn:PGA:401850915',
      shape: 'TOURNAMENT',
      name: 'Bank of Utah Championship',
      rawStatus: 'LIVE',
    });
    expect(events[0]?.competitors.map((c) => c.score)).toEqual(['-23', '-22', '-18', '-18', '-18']);
  });

  it('F1: flattens the weekend into sessions within 12h lookback', () => {
    const { events } = run('F1', 'f1-weekend');
    // FP1–FP3 and qualifying finished more than 12h before NOW.
    expect(events.map((e) => e.name)).toEqual(['Gulf Air Bahrain GP in Malaysia · Race']);
    expect(events[0]).toMatchObject({ shape: 'TOURNAMENT', rawStatus: 'SCHEDULED' });
    expect(events[0]?.broadcasts).toEqual([{ name: 'Apple TV', market: 'NATIONAL' }]);
  });

  it('tennis: singles matches only, within 24h lookback, with set scores', () => {
    const { events } = run('WTA', 'tennis-tournament');
    expect(events.every((e) => e.shape === 'INDIVIDUAL')).toBe(true);
    expect(events.some((e) => e.name.includes('TBD'))).toBe(false); // doubles dropped
    const semi = events.find((e) => e.id === 'espn:WTA:184199');
    expect(semi).toMatchObject({
      name: 'A. Shubladze vs E. Jones',
      note: "Jingshan Tennis Open · Women's Singles · Semifinal",
    });
    expect(semi?.competitors.map((c) => c.score)).toEqual(['7 6', '5 4']);
    expect(semi?.competitors.every((c) => c.isHome === undefined)).toBe(true);
    const cutoff = NOW.getTime() - 24 * 3_600_000;
    expect(events.every((e) => Date.parse(e.startTime) >= cutoff)).toBe(true);
  });

  it('MMA: one event per card, main event as the matchup', () => {
    const { events } = run('UFC', 'ufc-card');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: 'espn:UFC:600061182',
      name: 'UFC 332: Silva vs. Wang',
      rawStatus: 'LIVE',
      note: 'Main event · W Flyweight',
      broadcasts: [{ name: 'Paramount+', market: 'NATIONAL' }],
      venue: { name: 'Delta Center', city: 'Salt Lake City', state: 'UT' },
    });
    expect(events[0]?.competitors.map((c) => c.name)).toEqual(['Natalia Silva', 'Wang Cong']);
  });
});

describe('resilience', () => {
  it('skips malformed events without dropping the rest', () => {
    const good = (fixture('soccer-nations') as { events: unknown[] }).events[0];
    const { events, invalid } = normalizeScoreboard(
      endpoint('UEFA_NATIONS'),
      { events: [{ nonsense: true }, good, null] },
      NOW,
    );
    expect(invalid).toBe(2);
    expect(events).toHaveLength(1);
  });

  it('treats a non-scoreboard payload as invalid', () => {
    expect(normalizeScoreboard(endpoint('NFL'), 'oops', NOW)).toEqual({ events: [], invalid: 1 });
    expect(normalizeScoreboard(endpoint('NFL'), {}, NOW)).toEqual({ events: [], invalid: 0 });
  });
});

describe('mapEspnStatus', () => {
  const s = (name: string, state = 'pre', completed = false) => ({
    type: { name, state, completed },
  });
  it.each([
    [s('STATUS_SCHEDULED'), 'SCHEDULED'],
    [s('STATUS_IN_PROGRESS', 'in'), 'LIVE'],
    [s('STATUS_END_PERIOD', 'in'), 'LIVE'],
    [s('STATUS_HALFTIME', 'in'), 'HALFTIME'],
    [s('STATUS_RAIN_DELAY', 'in'), 'DELAYED'],
    [s('STATUS_SUSPENDED', 'in'), 'DELAYED'],
    [s('STATUS_FINAL', 'post', true), 'FINAL'],
    [s('STATUS_FULL_TIME', 'post', true), 'FINAL'],
    [s('STATUS_RETIRED', 'post', true), 'FINAL'],
    [s('STATUS_POSTPONED', 'post', true), 'POSTPONED'],
    [s('STATUS_CANCELED', 'post', true), 'CANCELED'],
    [s('STATUS_WHATEVER', 'post', true), 'FINAL'],
    [s('STATUS_WHATEVER', 'post'), 'FINAL'],
  ] as const)('%j → %s', (status, expected) => {
    expect(mapEspnStatus(status)).toBe(expected);
  });

  it('defaults to SCHEDULED with no status', () => {
    expect(mapEspnStatus(undefined)).toBe('SCHEDULED');
  });
});

describe('extractBroadcasts', () => {
  it('drops radio, dedupes, and prefers national over regional', () => {
    expect(
      extractBroadcasts([
        {
          id: '1',
          competitors: [],
          geoBroadcasts: [
            { type: { shortName: 'TV' }, market: { type: 'Home' }, media: { shortName: 'ESPN' } },
            {
              type: { shortName: 'TV' },
              market: { type: 'National' },
              media: { shortName: 'ESPN' },
            },
            {
              type: { shortName: 'Radio' },
              market: { type: 'National' },
              media: { shortName: 'KXL' },
            },
            { type: { shortName: 'TV' }, market: { type: 'Away' }, media: { shortName: ' ' } },
          ],
        },
      ]),
    ).toEqual([{ name: 'ESPN', market: 'NATIONAL' }]);
  });

  it('falls back to legacy broadcasts when geoBroadcasts is absent', () => {
    expect(
      extractBroadcasts([
        {
          id: '1',
          competitors: [],
          broadcasts: [{ market: 'away', names: ['ROOT Sports', 'ESPN+'] }],
        },
      ]),
    ).toEqual([
      { name: 'ROOT Sports', market: 'AWAY' },
      { name: 'ESPN+', market: 'AWAY' },
    ]);
  });
});

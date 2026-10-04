import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mapMlbStatus, normalizeSchedule } from './normalize';

// Trimmed real StatsAPI response (AAA, 2026-09-01); a radio entry was added.
const fixture = JSON.parse(
  readFileSync(new URL('./__fixtures__/aaa-schedule.json', import.meta.url), 'utf8'),
) as unknown;

describe('normalizeSchedule', () => {
  const { events, invalid } = normalizeSchedule(fixture);

  it('normalizes every game', () => {
    expect(invalid).toBe(0);
    expect(events.map((e) => e.rawStatus)).toEqual(['FINAL', 'POSTPONED', 'CANCELED']);
  });

  it('builds a team event with logos and scores', () => {
    const e = events[0]!;
    expect(e).toMatchObject({
      source: 'MLB_STATSAPI',
      sport: 'BASEBALL',
      league: 'AAA',
      shape: 'TEAM',
    });
    expect(e.id).toMatch(/^mlb:AAA:\d+$/);
    const [away, home] = e.competitors;
    expect(away).toMatchObject({
      name: 'Scranton/Wilkes-Barre RailRiders',
      isHome: false,
      score: '2',
    });
    expect(home?.isHome).toBe(true);
    expect(away?.logoUrl).toBe(`https://www.mlbstatic.com/team-logos/${away?.id}.svg`);
  });

  it('keeps TV only and merges home/away duplicates', () => {
    expect(events[0]?.broadcasts).toEqual([
      { name: 'Bally Sports Live', market: 'HOME' },
      { name: 'MiLB.TV', market: expect.any(String) },
    ]);
  });

  it('rejects a non-schedule payload', () => {
    expect(normalizeSchedule(42)).toEqual({ events: [], invalid: 1 });
  });
});

describe('mapMlbStatus', () => {
  it.each([
    [{ abstractGameState: 'Preview', detailedState: 'Scheduled' }, 'SCHEDULED'],
    [{ abstractGameState: 'Preview', detailedState: 'Pre-Game' }, 'SCHEDULED'],
    [{ abstractGameState: 'Live', detailedState: 'In Progress' }, 'LIVE'],
    [{ abstractGameState: 'Live', detailedState: 'Delayed: Rain' }, 'DELAYED'],
    [{ abstractGameState: 'Live', detailedState: 'Suspended: Rain' }, 'DELAYED'],
    [{ abstractGameState: 'Final', detailedState: 'Game Over' }, 'FINAL'],
    [{ abstractGameState: 'Final', detailedState: 'Postponed' }, 'POSTPONED'],
    [{ abstractGameState: 'Final', detailedState: 'Cancelled' }, 'CANCELED'],
  ] as const)('%j → %s', (status, expected) => {
    expect(mapMlbStatus(status)).toBe(expected);
  });
});

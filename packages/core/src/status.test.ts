import { describe, expect, it } from 'vitest';
import {
  DISPLAY_STATUSES,
  STATUS_RANK,
  computeDisplayStatus,
  isLiveFamily,
  isStartingFamily,
  isTerminal,
  isUpcomingFamily,
  type RawEventStatus,
} from './status';
import type { SportId } from './sports';

const NOW = new Date('2026-10-04T19:00:00Z');

function at(minutesFromNow: number, rawStatus: RawEventStatus, sport: SportId = 'BASKETBALL') {
  return computeDisplayStatus({
    rawStatus,
    sport,
    startTime: new Date(NOW.getTime() + minutesFromNow * 60_000),
    now: NOW,
  });
}

describe('computeDisplayStatus', () => {
  it.each([
    // [minutes until start, feed status, expected, inferred]
    [120, 'SCHEDULED', 'UPCOMING', false],
    [16, 'SCHEDULED', 'UPCOMING', false],
    [15, 'SCHEDULED', 'STARTING_SOON', false],
    [0, 'SCHEDULED', 'STARTING_SOON', false],
    [-5, 'SCHEDULED', 'STARTING_SOON', false],
    [-6, 'SCHEDULED', 'AWAITING_UPDATE', true],
    [-30, 'SCHEDULED', 'AWAITING_UPDATE', true],
    [-31, 'SCHEDULED', 'DELAYED', true],
    [-60, 'LIVE', 'LIVE', false],
    [5, 'LIVE', 'LIVE', false],
    [-60, 'HALFTIME', 'HALFTIME', false],
    [60, 'DELAYED', 'DELAYED', false],
    [-60, 'FINAL', 'FINAL', false],
    [600, 'POSTPONED', 'POSTPONED', false],
    [-600, 'CANCELED', 'CANCELED', false],
  ] as const)('%i min, feed %s → %s', (minutes, raw, expected, inferred) => {
    const r = at(minutes, raw);
    expect(r.status).toBe(expected);
    expect(r.inferred).toBe(inferred);
  });

  it('ignores an early LIVE/HALFTIME and follows the clock', () => {
    expect(at(10, 'LIVE').status).toBe('STARTING_SOON');
    expect(at(90, 'HALFTIME').status).toBe('UPCOMING');
    expect(at(10, 'LIVE').reason).toContain('ignored feed LIVE');
  });

  it('auto-FINALs anything past the sport max duration', () => {
    expect(at(-181, 'LIVE', 'BASKETBALL')).toMatchObject({ status: 'FINAL', inferred: true });
    expect(at(-179, 'LIVE', 'BASKETBALL').status).toBe('LIVE');
    expect(at(-181, 'SCHEDULED', 'BASKETBALL').status).toBe('FINAL');
    expect(at(-181, 'DELAYED', 'BASKETBALL').status).toBe('FINAL');
  });

  it('keeps a full fight card live', () => {
    expect(at(-6.5 * 60, 'LIVE', 'MMA').status).toBe('LIVE');
    expect(at(-8.5 * 60, 'LIVE', 'MMA').status).toBe('FINAL');
  });

  it('gives multi-day tournaments room', () => {
    expect(at(-48 * 60, 'LIVE', 'GOLF').status).toBe('LIVE');
    expect(at(-10 * 24 * 60, 'LIVE', 'TENNIS').status).toBe('LIVE');
    expect(at(-121 * 60, 'LIVE', 'GOLF').status).toBe('FINAL');
  });

  it('reports minutes until start', () => {
    expect(at(30, 'SCHEDULED').minutesUntilStart).toBe(30);
    expect(at(-30, 'LIVE').minutesUntilStart).toBe(-30);
  });
});

describe('status families and ranks', () => {
  it('ranks every status uniquely in PRD order', () => {
    expect(DISPLAY_STATUSES.map((s) => STATUS_RANK[s])).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('classifies families', () => {
    expect(DISPLAY_STATUSES.filter(isTerminal)).toEqual(['POSTPONED', 'CANCELED', 'FINAL']);
    expect(DISPLAY_STATUSES.filter(isLiveFamily)).toEqual(['LIVE', 'HALFTIME']);
    expect(DISPLAY_STATUSES.filter(isStartingFamily)).toEqual([
      'DELAYED',
      'AWAITING_UPDATE',
      'STARTING_SOON',
    ]);
    expect(DISPLAY_STATUSES.filter(isUpcomingFamily)).toEqual([
      'DELAYED',
      'AWAITING_UPDATE',
      'STARTING_SOON',
      'UPCOMING',
    ]);
  });
});

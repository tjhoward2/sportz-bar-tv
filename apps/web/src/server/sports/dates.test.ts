import { describe, expect, it } from 'vitest';
import { easternDays } from './dates';

describe('easternDays', () => {
  it('uses the Eastern calendar date, not UTC', () => {
    // 02:20 UTC on Oct 4 is still Oct 3 in New York.
    expect(easternDays(new Date('2026-10-04T02:20:00Z'), -1, 1)).toEqual([
      '20261002',
      '20261003',
      '20261004',
    ]);
  });

  it('crosses month and year boundaries', () => {
    expect(easternDays(new Date('2026-12-31T17:00:00Z'), 0, 1)).toEqual(['20261231', '20270101']);
  });

  it('does not skip or repeat days across DST changes', () => {
    // US DST ends 2026-11-01.
    expect(easternDays(new Date('2026-10-31T12:00:00Z'), 0, 2)).toEqual([
      '20261031',
      '20261101',
      '20261102',
    ]);
  });
});

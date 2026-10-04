import { describe, expect, it } from 'vitest';
import { filtersToQuery, parseFilters } from './filters';

describe('dashboard filters in the URL', () => {
  it('round-trips', () => {
    const f = parseFilters({
      status: 'LIVE',
      sport: 'HOCKEY',
      league: 'NHL',
      availability: 'AVAILABLE',
    });
    expect(f).toEqual({
      status: 'LIVE',
      availability: 'AVAILABLE',
      sport: 'HOCKEY',
      league: 'NHL',
    });
    expect(filtersToQuery(f)).toBe('?status=LIVE&availability=AVAILABLE&sport=HOCKEY&league=NHL');
  });

  it('ignores junk and leagues from another sport', () => {
    expect(parseFilters({ status: 'nope', sport: 'CURLING' })).toEqual({
      status: 'ALL',
      availability: 'ALL',
      sport: undefined,
      league: undefined,
    });
    expect(parseFilters({ sport: 'HOCKEY', league: 'NBA' }).league).toBeUndefined();
    expect(filtersToQuery(parseFilters({}))).toBe('');
  });
});

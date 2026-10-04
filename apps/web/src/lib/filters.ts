import { getLeague, isSportId } from '@sbtv/core';
import type { Filters } from '@/components/FilterBar';

/** URL search params ⇄ dashboard filters (filter state lives in the URL). */
export function parseFilters(params: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const sport = one('sport');
  const league = one('league');
  const status = one('status');
  const validSport = sport && isSportId(sport) ? sport : undefined;
  return {
    status: status === 'LIVE' || status === 'UPCOMING' ? status : 'ALL',
    availability: one('availability') === 'AVAILABLE' ? 'AVAILABLE' : 'ALL',
    sport: validSport,
    league: validSport && league && getLeague(league)?.sport === validSport ? league : undefined,
  };
}

export function filtersToQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.status !== 'ALL') p.set('status', f.status);
  if (f.availability !== 'ALL') p.set('availability', f.availability);
  if (f.sport) p.set('sport', f.sport);
  if (f.league) p.set('league', f.league);
  const s = p.toString();
  return s ? `?${s}` : '';
}

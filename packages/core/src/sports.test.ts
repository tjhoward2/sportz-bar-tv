import { describe, expect, it } from 'vitest';
import {
  LEAGUES,
  SPORT_IDS,
  SPORTS,
  getLeague,
  isChampionshipLeague,
  isSportId,
  leaguesForSport,
} from './sports';

describe('sports taxonomy', () => {
  it('defines all 11 sports with an emoji and label', () => {
    expect(SPORT_IDS).toHaveLength(11);
    for (const id of SPORT_IDS) {
      expect(SPORTS[id].id).toBe(id);
      expect(SPORTS[id].label).not.toBe('');
      expect(SPORTS[id].emoji).not.toBe('');
    }
  });

  it('has unique league IDs', () => {
    const ids = LEAGUES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every sport at least one league', () => {
    for (const id of SPORT_IDS) {
      expect(leaguesForSport(id).length).toBeGreaterThan(0);
    }
  });

  it('flags the PRD championship leagues', () => {
    const expected = [
      'FIFA_WORLD_CUP',
      'FIFA_WWC',
      'FIFA_CWC',
      'UEFA_EURO',
      'UEFA_EUROPA',
      'UEFA_NATIONS',
      'COPA_AMERICA',
      'CONCACAF_GOLD',
      'COPA_LIBERTADORES',
      'CONCACAF_CL',
      'UWCL',
      'WEURO',
    ];
    const actual = LEAGUES.filter((l) => l.isChampionship).map((l) => l.id);
    expect(actual.sort()).toEqual(expected.sort());
    expect(isChampionshipLeague('NBA')).toBe(false);
    expect(isChampionshipLeague('NOT_A_LEAGUE')).toBe(false);
  });

  it('looks up leagues and validates sport IDs', () => {
    expect(getLeague('NBA')?.sport).toBe('BASKETBALL');
    expect(getLeague('nope')).toBeUndefined();
    expect(isSportId('HOCKEY')).toBe(true);
    expect(isSportId('hockey')).toBe(false);
  });
});

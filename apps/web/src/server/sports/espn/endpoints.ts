import type { LeagueId, SportId } from '@sbtv/core';

export interface EspnEndpoint {
  sport: SportId;
  league: LeagueId;
  /** Path under site.api.espn.com/apis/site/v2/sports/ */
  path: string;
}

export const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports';

/**
 * One scoreboard per league. Not covered by ESPN: AAA (MLB StatsAPI
 * adapter), LIV, MASTERS (appears in the PGA feed), MOTOGP.
 *
 * PRO_BOXING is omitted: `boxing/scoreboard` returned 404 on 2026-10-04.
 * NCAA_SOFTBALL returned 400 the same day (off-season); kept, since a
 * failing feed is reported and skipped, never fatal.
 */
export const ESPN_ENDPOINTS: readonly EspnEndpoint[] = [
  { sport: 'BASKETBALL', league: 'NBA', path: 'basketball/nba' },
  { sport: 'BASKETBALL', league: 'WNBA', path: 'basketball/wnba' },
  { sport: 'BASKETBALL', league: 'NCAAB', path: 'basketball/mens-college-basketball' },
  { sport: 'BASKETBALL', league: 'NCAAWBB', path: 'basketball/womens-college-basketball' },
  { sport: 'FOOTBALL', league: 'NFL', path: 'football/nfl' },
  { sport: 'FOOTBALL', league: 'NCAAF', path: 'football/college-football' },
  { sport: 'BASEBALL', league: 'MLB', path: 'baseball/mlb' },
  { sport: 'BASEBALL', league: 'COLLEGE_BASEBALL', path: 'baseball/college-baseball' },
  { sport: 'SOFTBALL', league: 'NCAA_SOFTBALL', path: 'softball/college-softball' },
  { sport: 'HOCKEY', league: 'NHL', path: 'hockey/nhl' },
  { sport: 'HOCKEY', league: 'COLLEGE_HOCKEY', path: 'hockey/mens-college-hockey' },
  { sport: 'SOCCER', league: 'MLS', path: 'soccer/usa.1' },
  { sport: 'SOCCER', league: 'EPL', path: 'soccer/eng.1' },
  { sport: 'SOCCER', league: 'UEFA_CL', path: 'soccer/uefa.champions' },
  { sport: 'SOCCER', league: 'LIGA_MX', path: 'soccer/mex.1' },
  { sport: 'SOCCER', league: 'CONCACAF_CL', path: 'soccer/concacaf.champions' },
  { sport: 'SOCCER', league: 'FIFA_WORLD_CUP', path: 'soccer/fifa.world' },
  { sport: 'SOCCER', league: 'FIFA_WWC', path: 'soccer/fifa.wwc' },
  { sport: 'SOCCER', league: 'FIFA_CWC', path: 'soccer/fifa.cwc' },
  { sport: 'SOCCER', league: 'UEFA_EURO', path: 'soccer/uefa.euro' },
  { sport: 'SOCCER', league: 'UEFA_EUROPA', path: 'soccer/uefa.europa' },
  { sport: 'SOCCER', league: 'UEFA_NATIONS', path: 'soccer/uefa.nations' },
  { sport: 'SOCCER', league: 'COPA_AMERICA', path: 'soccer/conmebol.america' },
  { sport: 'SOCCER', league: 'CONCACAF_GOLD', path: 'soccer/concacaf.gold' },
  { sport: 'SOCCER', league: 'COPA_LIBERTADORES', path: 'soccer/conmebol.libertadores' },
  { sport: 'SOCCER', league: 'NWSL', path: 'soccer/usa.nwsl' },
  { sport: 'SOCCER', league: 'WSL', path: 'soccer/eng.w.1' },
  { sport: 'SOCCER', league: 'UWCL', path: 'soccer/uefa.wchampions' },
  { sport: 'SOCCER', league: 'WEURO', path: 'soccer/uefa.weuro' },
  { sport: 'GOLF', league: 'PGA', path: 'golf/pga' },
  { sport: 'MMA', league: 'UFC', path: 'mma/ufc' },
  { sport: 'MMA', league: 'BELLATOR', path: 'mma/bellator' },
  { sport: 'MMA', league: 'PFL', path: 'mma/pfl' },
  { sport: 'TENNIS', league: 'ATP', path: 'tennis/atp' },
  { sport: 'TENNIS', league: 'WTA', path: 'tennis/wta' },
  { sport: 'RACING', league: 'F1', path: 'racing/f1' },
];

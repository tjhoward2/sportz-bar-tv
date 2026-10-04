/**
 * Sports taxonomy (PRD §4).
 *
 * Single source of truth for which sports and leagues exist. Both apps and
 * the data adapters key off these IDs, so renaming one is a breaking change.
 */

export const SPORT_IDS = [
  'BASKETBALL',
  'FOOTBALL',
  'BASEBALL',
  'SOFTBALL',
  'HOCKEY',
  'SOCCER',
  'GOLF',
  'MMA',
  'BOXING',
  'TENNIS',
  'RACING',
] as const;

export type SportId = (typeof SPORT_IDS)[number];

export interface Sport {
  id: SportId;
  label: string;
  emoji: string;
}

export const SPORTS: Readonly<Record<SportId, Sport>> = {
  BASKETBALL: { id: 'BASKETBALL', label: 'Basketball', emoji: '🏀' },
  FOOTBALL: { id: 'FOOTBALL', label: 'Football', emoji: '🏈' },
  BASEBALL: { id: 'BASEBALL', label: 'Baseball', emoji: '⚾' },
  SOFTBALL: { id: 'SOFTBALL', label: 'Softball', emoji: '🥎' },
  HOCKEY: { id: 'HOCKEY', label: 'Hockey', emoji: '🏒' },
  SOCCER: { id: 'SOCCER', label: 'Soccer', emoji: '⚽' },
  GOLF: { id: 'GOLF', label: 'Golf', emoji: '⛳' },
  MMA: { id: 'MMA', label: 'MMA', emoji: '🤼' },
  BOXING: { id: 'BOXING', label: 'Boxing', emoji: '🥊' },
  TENNIS: { id: 'TENNIS', label: 'Tennis', emoji: '🎾' },
  RACING: { id: 'RACING', label: 'Racing', emoji: '🏎' },
};

export interface League {
  id: string;
  label: string;
  sport: SportId;
  /** Every game is championship context; widens the upcoming window to 7 days. */
  isChampionship: boolean;
}

// `as const satisfies` keeps literal IDs for the LeagueId type while still
// checking each entry's shape.
const LEAGUE_LIST = [
  // Basketball
  { id: 'NBA', label: 'NBA', sport: 'BASKETBALL', isChampionship: false },
  { id: 'WNBA', label: 'WNBA', sport: 'BASKETBALL', isChampionship: false },
  { id: 'NCAAB', label: "NCAA Men's BB", sport: 'BASKETBALL', isChampionship: false },
  { id: 'NCAAWBB', label: "NCAA Women's BB", sport: 'BASKETBALL', isChampionship: false },
  // Football
  { id: 'NFL', label: 'NFL', sport: 'FOOTBALL', isChampionship: false },
  { id: 'NCAAF', label: 'NCAA Football', sport: 'FOOTBALL', isChampionship: false },
  // Baseball
  { id: 'MLB', label: 'MLB', sport: 'BASEBALL', isChampionship: false },
  { id: 'AAA', label: 'Triple-A', sport: 'BASEBALL', isChampionship: false },
  { id: 'COLLEGE_BASEBALL', label: 'College Baseball', sport: 'BASEBALL', isChampionship: false },
  // Softball
  { id: 'NCAA_SOFTBALL', label: 'NCAA Softball', sport: 'SOFTBALL', isChampionship: false },
  // Hockey
  { id: 'NHL', label: 'NHL', sport: 'HOCKEY', isChampionship: false },
  { id: 'COLLEGE_HOCKEY', label: 'College Hockey', sport: 'HOCKEY', isChampionship: false },
  // Soccer
  { id: 'MLS', label: 'MLS', sport: 'SOCCER', isChampionship: false },
  { id: 'EPL', label: 'Premier League', sport: 'SOCCER', isChampionship: false },
  { id: 'UEFA_CL', label: 'Champions League', sport: 'SOCCER', isChampionship: false },
  { id: 'LIGA_MX', label: 'Liga MX', sport: 'SOCCER', isChampionship: false },
  { id: 'CONCACAF_CL', label: 'CONCACAF Champions Cup', sport: 'SOCCER', isChampionship: true },
  { id: 'FIFA_WORLD_CUP', label: 'FIFA World Cup', sport: 'SOCCER', isChampionship: true },
  { id: 'FIFA_WWC', label: "FIFA Women's World Cup", sport: 'SOCCER', isChampionship: true },
  { id: 'FIFA_CWC', label: 'FIFA Club World Cup', sport: 'SOCCER', isChampionship: true },
  { id: 'UEFA_EURO', label: 'UEFA Euro', sport: 'SOCCER', isChampionship: true },
  { id: 'UEFA_EUROPA', label: 'Europa League', sport: 'SOCCER', isChampionship: true },
  { id: 'UEFA_NATIONS', label: 'UEFA Nations League', sport: 'SOCCER', isChampionship: true },
  { id: 'COPA_AMERICA', label: 'Copa América', sport: 'SOCCER', isChampionship: true },
  { id: 'CONCACAF_GOLD', label: 'Gold Cup', sport: 'SOCCER', isChampionship: true },
  { id: 'COPA_LIBERTADORES', label: 'Copa Libertadores', sport: 'SOCCER', isChampionship: true },
  { id: 'NWSL', label: 'NWSL', sport: 'SOCCER', isChampionship: false },
  { id: 'WSL', label: "Women's Super League", sport: 'SOCCER', isChampionship: false },
  { id: 'UWCL', label: "Women's Champions League", sport: 'SOCCER', isChampionship: true },
  { id: 'WEURO', label: "Women's Euro", sport: 'SOCCER', isChampionship: true },
  // Golf
  { id: 'PGA', label: 'PGA Tour', sport: 'GOLF', isChampionship: false },
  { id: 'LIV', label: 'LIV Golf', sport: 'GOLF', isChampionship: false },
  { id: 'MASTERS', label: 'The Masters', sport: 'GOLF', isChampionship: false },
  // MMA
  { id: 'UFC', label: 'UFC', sport: 'MMA', isChampionship: false },
  { id: 'BELLATOR', label: 'Bellator', sport: 'MMA', isChampionship: false },
  { id: 'PFL', label: 'PFL', sport: 'MMA', isChampionship: false },
  // Boxing
  { id: 'PRO_BOXING', label: 'Boxing', sport: 'BOXING', isChampionship: false },
  // Tennis
  { id: 'ATP', label: 'ATP', sport: 'TENNIS', isChampionship: false },
  { id: 'WTA', label: 'WTA', sport: 'TENNIS', isChampionship: false },
  { id: 'GRAND_SLAM', label: 'Grand Slam', sport: 'TENNIS', isChampionship: false },
  // Racing
  { id: 'F1', label: 'Formula 1', sport: 'RACING', isChampionship: false },
  { id: 'MOTOGP', label: 'MotoGP', sport: 'RACING', isChampionship: false },
] as const satisfies readonly League[];

export type LeagueId = (typeof LEAGUE_LIST)[number]['id'];

export const LEAGUES: readonly League[] = LEAGUE_LIST;

const LEAGUE_BY_ID: ReadonlyMap<string, League> = new Map(LEAGUES.map((l) => [l.id, l]));

export function getLeague(id: string): League | undefined {
  return LEAGUE_BY_ID.get(id);
}

export function leaguesForSport(sport: SportId): League[] {
  return LEAGUES.filter((l) => l.sport === sport);
}

export function isSportId(value: string): value is SportId {
  return (SPORT_IDS as readonly string[]).includes(value);
}

export function isChampionshipLeague(id: string): boolean {
  return getLeague(id)?.isChampionship ?? false;
}

/**
 * Local-interest tags. Matched on full team names, not nicknames:
 * "Ducks" alone would also tag the Anaheim Ducks.
 */
const LOCAL_TEAMS = [
  'Portland Trail Blazers',
  'Portland Timbers',
  'Portland Thorns',
  'Portland Fire',
  'Oregon Ducks',
  'Oregon State Beavers',
  'Portland Pilots',
  'Portland State Vikings',
  'Seattle Seahawks',
  'Seattle Mariners',
  'Seattle Kraken',
  'Seattle Sounders',
  'Seattle Reign',
  'Seattle Storm',
  'Washington Huskies',
  'Tacoma Rainiers',
  'Hillsboro Hops',
].map((t) => t.toLowerCase());

export function tagsForTeams(teamNames: readonly string[]): string[] {
  const names = teamNames.map((n) => n.toLowerCase());
  return names.some((n) => LOCAL_TEAMS.some((t) => n.includes(t))) ? ['LOCAL'] : [];
}

/**
 * Streaming services (PRD §8).
 *
 * Matching is exact on the normalized name, not substring regex: a
 * substring rule like /FLO/ would match "FLORIDA", and an unmatched name
 * safely becomes "CHECK GUIDE" instead of a wrong answer.
 */

export const STREAMING_KEYS = [
  'ESPN_PLUS',
  'PEACOCK',
  'PRIME_VIDEO',
  'APPLE_TV',
  'PARAMOUNT',
  'MAX',
  'NFL_PLUS',
  'NBA_LP',
  'MLB_TV',
  'NHL_CI',
  'NFL_ST',
  'MLB_EI',
  'MLS_SP',
  'FLOSPORTS',
  'DAZN',
] as const;

export type StreamingKey = (typeof STREAMING_KEYS)[number];

export interface StreamingService {
  key: StreamingKey;
  label: string;
  /** Spellings seen in feeds, compared after normalizeStreamingName(). */
  aliases: readonly string[];
}

export const STREAMING_SERVICES: Readonly<Record<StreamingKey, StreamingService>> = {
  ESPN_PLUS: { key: 'ESPN_PLUS', label: 'ESPN+', aliases: ['ESPN+', 'ESPN PLUS', 'ESPNPLUS'] },
  PEACOCK: { key: 'PEACOCK', label: 'Peacock', aliases: ['PEACOCK'] },
  PRIME_VIDEO: {
    key: 'PRIME_VIDEO',
    label: 'Prime Video',
    aliases: ['PRIME VIDEO', 'AMAZON PRIME', 'AMAZON PRIME VIDEO'],
  },
  APPLE_TV: { key: 'APPLE_TV', label: 'Apple TV+', aliases: ['APPLE TV+', 'APPLETV+', 'APPLE TV'] },
  PARAMOUNT: { key: 'PARAMOUNT', label: 'Paramount+', aliases: ['PARAMOUNT+', 'PARAMOUNT PLUS'] },
  MAX: { key: 'MAX', label: 'Max', aliases: ['MAX', 'HBO MAX'] },
  NFL_PLUS: { key: 'NFL_PLUS', label: 'NFL+', aliases: ['NFL+', 'NFL PLUS'] },
  NBA_LP: { key: 'NBA_LP', label: 'NBA League Pass', aliases: ['NBA LP', 'NBA LEAGUE PASS'] },
  MLB_TV: { key: 'MLB_TV', label: 'MLB.TV', aliases: ['MLB.TV', 'MLB TV'] },
  NHL_CI: { key: 'NHL_CI', label: 'NHL Center Ice', aliases: ['NHL CI', 'NHL CENTER ICE'] },
  NFL_ST: {
    key: 'NFL_ST',
    label: 'NFL Sunday Ticket',
    aliases: ['NFL ST', 'NFL SUNDAY TICKET'],
  },
  MLB_EI: {
    key: 'MLB_EI',
    label: 'MLB Extra Innings',
    aliases: ['MLB EI', 'MLB EXTRA INNINGS'],
  },
  MLS_SP: { key: 'MLS_SP', label: 'MLS Season Pass', aliases: ['MLS SEASON PASS', 'MLS SP'] },
  FLOSPORTS: { key: 'FLOSPORTS', label: 'FloSports', aliases: ['FLOSPORTS', 'FLO SPORTS'] },
  DAZN: { key: 'DAZN', label: 'DAZN', aliases: ['DAZN'] },
};

function normalizeStreamingName(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, ' ').trim();
}

const STREAMING_BY_ALIAS: ReadonlyMap<string, StreamingKey> = new Map(
  Object.values(STREAMING_SERVICES).flatMap((s) => s.aliases.map((a) => [a, s.key] as const)),
);

export function toStreamingKey(raw: string): StreamingKey | undefined {
  return STREAMING_BY_ALIAS.get(normalizeStreamingName(raw));
}

export function isStreamingKey(value: string): value is StreamingKey {
  return (STREAMING_KEYS as readonly string[]).includes(value);
}

/**
 * TV network identity.
 *
 * ESPN and MLB StatsAPI spell networks many ways ("FOX SPORTS 1", "FS1",
 * "KGW-HD"). Everything downstream works on canonical IDs so a channel
 * table needs exactly one entry per network.
 */

export const TV_NETWORK_IDS = [
  'ESPN',
  'ESPN2',
  'ESPNU',
  'ESPNEWS',
  'FS1',
  'FS2',
  'TNT',
  'TBS',
  'TRUTV',
  'USA',
  'GOLF',
  'TENNIS',
  'MLBN',
  'NHLN',
  'NBATV',
  'NFLN',
  'ACCN',
  'SECN',
  'BTN',
  'ROOT_NW',
  'ABC',
  'CBS',
  'NBC',
  'FOX',
] as const;

export type TvNetworkId = (typeof TV_NETWORK_IDS)[number];

export const TV_NETWORK_LABELS: Readonly<Record<TvNetworkId, string>> = {
  ESPN: 'ESPN',
  ESPN2: 'ESPN2',
  ESPNU: 'ESPNU',
  ESPNEWS: 'ESPNEWS',
  FS1: 'FS1',
  FS2: 'FS2',
  TNT: 'TNT',
  TBS: 'TBS',
  TRUTV: 'truTV',
  USA: 'USA',
  GOLF: 'Golf Channel',
  TENNIS: 'Tennis Channel',
  MLBN: 'MLB Network',
  NHLN: 'NHL Network',
  NBATV: 'NBA TV',
  NFLN: 'NFL Network',
  ACCN: 'ACC Network',
  SECN: 'SEC Network',
  BTN: 'Big Ten Network',
  ROOT_NW: 'ROOT Sports NW',
  ABC: 'ABC',
  CBS: 'CBS',
  NBC: 'NBC',
  FOX: 'FOX',
};

/** Over-the-air broadcast networks; carried by local affiliates. */
export const LOCAL_BROADCAST_NETWORKS: ReadonlySet<TvNetworkId> = new Set([
  'ABC',
  'CBS',
  'NBC',
  'FOX',
]);

/**
 * Normalized spelling → canonical ID. Keys are output of normalizeName().
 *
 * Portland affiliate call signs are included because StatsAPI reports them.
 * KUNP is deliberately absent: it is not an ABC affiliate (it carries
 * Trail Blazers games), so mapping it to ABC would show a wrong channel.
 */
const TV_ALIASES: Readonly<Record<string, TvNetworkId>> = {
  ESPN: 'ESPN',
  ESPN2: 'ESPN2',
  'ESPN 2': 'ESPN2',
  ESPNU: 'ESPNU',
  'ESPN U': 'ESPNU',
  ESPNEWS: 'ESPNEWS',
  'ESPN NEWS': 'ESPNEWS',
  FS1: 'FS1',
  'FOX SPORTS 1': 'FS1',
  'FOX SPORTS ONE': 'FS1',
  FS2: 'FS2',
  'FOX SPORTS 2': 'FS2',
  'FOX SPORTS TWO': 'FS2',
  TNT: 'TNT',
  TBS: 'TBS',
  TRUTV: 'TRUTV',
  'TRU TV': 'TRUTV',
  USA: 'USA',
  'USA NETWORK': 'USA',
  GOLF: 'GOLF',
  'GOLF CHANNEL': 'GOLF',
  TENNIS: 'TENNIS',
  'TENNIS CHANNEL': 'TENNIS',
  MLBN: 'MLBN',
  'MLB NETWORK': 'MLBN',
  'MLB NET': 'MLBN',
  NHLN: 'NHLN',
  'NHL NETWORK': 'NHLN',
  'NHL NET': 'NHLN',
  NBATV: 'NBATV',
  'NBA TV': 'NBATV',
  NFLN: 'NFLN',
  'NFL NETWORK': 'NFLN',
  'NFL NET': 'NFLN',
  ACCN: 'ACCN',
  'ACC NETWORK': 'ACCN',
  SECN: 'SECN',
  'SEC NETWORK': 'SECN',
  BTN: 'BTN',
  'BIG TEN NETWORK': 'BTN',
  'ROOT NW': 'ROOT_NW',
  'ROOT SPORTS': 'ROOT_NW',
  'ROOT SPORTS NW': 'ROOT_NW',
  'ROOT SPORTS NORTHWEST': 'ROOT_NW',
  ABC: 'ABC',
  CBS: 'CBS',
  NBC: 'NBC',
  FOX: 'FOX',
  KATU: 'ABC',
  KOIN: 'CBS',
  KGW: 'NBC',
  KPTV: 'FOX',
};

/**
 * Uppercases, collapses whitespace, and strips feed suffixes ("HD", "-TV")
 * that never change which channel a network is on.
 */
export function normalizeName(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\s-](HD|TV)$/, '')
    .trim();
}

export function toTvNetworkId(raw: string): TvNetworkId | undefined {
  const name = normalizeName(raw);
  // "NBA TV" loses its "TV" to the suffix strip; check the unstripped form too.
  const unstripped = raw.toUpperCase().replace(/\s+/g, ' ').trim();
  return TV_ALIASES[unstripped] ?? TV_ALIASES[name];
}

export function isLocalBroadcast(network: TvNetworkId): boolean {
  return LOCAL_BROADCAST_NETWORKS.has(network);
}

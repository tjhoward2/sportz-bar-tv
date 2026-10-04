/**
 * Curated channel tables (PRD §7).
 *
 * Design rule: never show a channel number that isn't in these tables.
 * A table miss is UNKNOWN ("CHECK GUIDE"), never a guess. NOT_CARRIED is
 * only returned when it is certain (no TV service; cable nets on antenna).
 *
 * VERIFICATION: these numbers come from the PRD and the previous app and
 * have NOT been checked against the bar's current guide. Flip
 * `verified: true` per table once someone confirms it on a real TV.
 */

import type { ProviderKey } from './providers';
import { isLocalBroadcast, type TvNetworkId } from './networks';

interface ChannelTable {
  /** Free text: who confirmed it and when, or why it's unverified. */
  provenance: string;
  verified: boolean;
  channels: Partial<Record<TvNetworkId, string>>;
}

const DIRECTV_NATIONAL: ChannelTable = {
  provenance: 'PRD v1.0 / previous app. Not yet checked on-site.',
  verified: false,
  channels: {
    ESPN: '206',
    ESPN2: '209',
    ESPNU: '208',
    ESPNEWS: '207',
    FS1: '219',
    FS2: '618',
    TNT: '245',
    TBS: '247',
    TRUTV: '246',
    USA: '242',
    GOLF: '218',
    TENNIS: '217',
    MLBN: '213',
    NHLN: '215',
    NBATV: '216',
    NFLN: '212',
    ACCN: '612',
    SECN: '611',
    BTN: '610',
    ROOT_NW: '640',
  },
};

/** Xfinity lineups differ by headend; keyed by 3-digit ZIP prefix. */
const XFINITY_BY_ZIP_PREFIX: Readonly<Record<string, ChannelTable>> = {
  '972': {
    provenance: 'Previous app (Portland 972xx). Not yet checked on-site.',
    verified: false,
    channels: {
      ESPN: '33',
      ESPN2: '34',
      ESPNU: '35',
      FS1: '37',
      FS2: '38',
      TNT: '39',
      TBS: '36',
      USA: '40',
      GOLF: '95',
      TENNIS: '96',
      MLBN: '201',
      NHLN: '202',
      NBATV: '203',
      NFLN: '204',
      ROOT_NW: '738',
    },
  },
  '971': {
    provenance: 'PRD v1.0 (Portland 971xx). Not yet checked on-site.',
    verified: false,
    channels: {
      ESPN: '33',
      ESPN2: '34',
      FS1: '37',
      TNT: '39',
      TBS: '36',
      ROOT_NW: '738',
    },
  },
};

export type MarketId = 'PORTLAND' | 'SEATTLE';

const MARKET_BY_ZIP_PREFIX: Readonly<Record<string, MarketId>> = {
  '971': 'PORTLAND',
  '972': 'PORTLAND',
  '980': 'SEATTLE',
  '981': 'SEATTLE',
};

/**
 * Local affiliates' virtual channel numbers. DIRECTV, Xfinity and antennas
 * in these markets map locals to the same numbers. Not assumed for other
 * providers.
 */
const LOCAL_AFFILIATES: Readonly<Record<MarketId, ChannelTable>> = {
  PORTLAND: {
    provenance: 'PRD v1.0 (KATU 2, KOIN 6, KGW 8, KPTV 12). Not yet checked on-site.',
    verified: false,
    channels: { ABC: '2', CBS: '6', NBC: '8', FOX: '12' },
  },
  SEATTLE: {
    provenance: 'PRD v1.0. Not yet checked on-site.',
    verified: false,
    channels: { ABC: '4', NBC: '5', CBS: '7', FOX: '13' },
  },
};

const LOCAL_AFFILIATE_PROVIDERS: ReadonlySet<ProviderKey> = new Set([
  'DIRECTV',
  'XFINITY',
  'ANTENNA',
]);

export type ChannelLookup =
  | {
      kind: 'CHANNEL';
      channel: string;
      verified: boolean;
      source: 'NATIONAL' | 'REGIONAL_LINEUP' | 'LOCAL_AFFILIATE';
    }
  | { kind: 'NOT_CARRIED' }
  | { kind: 'UNKNOWN' };

const UNKNOWN: ChannelLookup = { kind: 'UNKNOWN' };
const NOT_CARRIED: ChannelLookup = { kind: 'NOT_CARRIED' };

/** First three digits of a US ZIP, or undefined if it isn't one. */
export function zipPrefix(zip: string | null | undefined): string | undefined {
  const match = zip?.trim().match(/^(\d{3})\d{2}(-\d{4})?$/);
  return match?.[1];
}

export function marketForZip(zip: string | null | undefined): MarketId | undefined {
  const prefix = zipPrefix(zip);
  return prefix ? MARKET_BY_ZIP_PREFIX[prefix] : undefined;
}

function fromTable(
  table: ChannelTable | undefined,
  network: TvNetworkId,
  source: 'NATIONAL' | 'REGIONAL_LINEUP' | 'LOCAL_AFFILIATE',
): ChannelLookup | undefined {
  const channel = table?.channels[network];
  return channel && table
    ? { kind: 'CHANNEL', channel, verified: table.verified, source }
    : undefined;
}

export function lookupChannel(
  provider: ProviderKey,
  network: TvNetworkId,
  zip: string | null | undefined,
): ChannelLookup {
  if (provider === 'NONE') return NOT_CARRIED;

  if (isLocalBroadcast(network)) {
    if (!LOCAL_AFFILIATE_PROVIDERS.has(provider)) return UNKNOWN;
    const market = marketForZip(zip);
    return (market && fromTable(LOCAL_AFFILIATES[market], network, 'LOCAL_AFFILIATE')) || UNKNOWN;
  }

  // Cable networks never come over the air.
  if (provider === 'ANTENNA') return NOT_CARRIED;

  if (provider === 'DIRECTV') {
    return fromTable(DIRECTV_NATIONAL, network, 'NATIONAL') ?? UNKNOWN;
  }

  if (provider === 'XFINITY') {
    const prefix = zipPrefix(zip);
    const table = prefix ? XFINITY_BY_ZIP_PREFIX[prefix] : undefined;
    return fromTable(table, network, 'REGIONAL_LINEUP') ?? UNKNOWN;
  }

  // No curated data for other providers yet.
  return UNKNOWN;
}

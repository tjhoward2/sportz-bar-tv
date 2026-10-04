/**
 * Broadcast resolution (PRD §9): "can this user watch this network, and
 * where?"
 *
 * Invariant: a TV chip in state HAVE always carries a curated channel
 * number. Anything less certain is UNKNOWN ("CHECK GUIDE").
 */

import { lookupChannel } from './channels';
import { TV_NETWORK_LABELS, normalizeName, toTvNetworkId, type TvNetworkId } from './networks';
import {
  PROVIDERS,
  normalizeProviderConfigs,
  type ProviderConfig,
  type ProviderKey,
} from './providers';
import { STREAMING_SERVICES, toStreamingKey, type StreamingKey } from './streaming';

/** Broadcast as reported by a data adapter. */
export interface BroadcastInput {
  name: string;
  /** Regional feeds are only available in the named team's market. */
  market?: 'NATIONAL' | 'HOME' | 'AWAY';
}

export interface UserTvConfig {
  providers: readonly ProviderConfig[];
  subscriptions: readonly StreamingKey[];
  zip?: string | null;
}

export const CHIP_PRIORITY = {
  PRIMARY_TV: 100,
  OTHER_TV: 80,
  STREAMING: 60,
} as const;

export type BroadcastDisplay =
  | {
      state: 'HAVE';
      kind: 'TV';
      network: TvNetworkId;
      label: string;
      provider: ProviderKey;
      providerLabel: string;
      channel: string;
      channelVerified: boolean;
      isPrimary: boolean;
      priority: number;
    }
  | {
      state: 'HAVE';
      kind: 'STREAMING';
      service: StreamingKey;
      label: string;
      priority: number;
    }
  | {
      state: 'MISSING';
      kind: 'TV' | 'STREAMING';
      label: string;
      reason: 'NOT_SUBSCRIBED' | 'NOT_CARRIED';
    }
  | {
      state: 'UNKNOWN';
      label: string;
      reason: 'NO_CHANNEL_DATA' | 'REGIONAL' | 'UNRECOGNIZED' | 'NO_PROVIDERS';
    };

function resolveTv(
  network: TvNetworkId,
  market: BroadcastInput['market'],
  providers: readonly ProviderConfig[],
  zip: string | null | undefined,
): BroadcastDisplay[] {
  const label = TV_NETWORK_LABELS[network];
  if (providers.length === 0) return [{ state: 'UNKNOWN', label, reason: 'NO_PROVIDERS' }];

  const have: BroadcastDisplay[] = [];
  let anyUnknown = false;
  for (const p of providers) {
    const result = lookupChannel(p.provider, network, zip);
    if (result.kind === 'CHANNEL') {
      have.push({
        state: 'HAVE',
        kind: 'TV',
        network,
        label,
        provider: p.provider,
        providerLabel: PROVIDERS[p.provider].shortLabel,
        channel: result.channel,
        channelVerified: result.verified,
        isPrimary: p.isPrimary,
        priority: p.isPrimary ? CHIP_PRIORITY.PRIMARY_TV : CHIP_PRIORITY.OTHER_TV,
      });
    } else if (result.kind === 'UNKNOWN') {
      anyUnknown = true;
    }
  }

  if (have.length > 0) return have;
  const regional = market === 'HOME' || market === 'AWAY';
  if (anyUnknown) {
    return [{ state: 'UNKNOWN', label, reason: regional ? 'REGIONAL' : 'NO_CHANNEL_DATA' }];
  }
  return [{ state: 'MISSING', kind: 'TV', label, reason: 'NOT_CARRIED' }];
}

function dedupeKey(d: BroadcastDisplay): string {
  if (d.state === 'HAVE' && d.kind === 'TV') return `TV:${d.network}:${d.provider}`;
  if (d.state === 'HAVE') return `STREAM:${d.service}`;
  return `${d.state}:${d.label}`;
}

const STATE_ORDER = { HAVE: 0, MISSING: 1, UNKNOWN: 2 } as const;

/**
 * Resolves every broadcast of a game against the user's setup. Output is
 * deduplicated and sorted: HAVE (highest priority first), then MISSING,
 * then UNKNOWN. Input order breaks ties.
 */
export function resolveBroadcasts(
  broadcasts: readonly (BroadcastInput | string)[],
  config: UserTvConfig,
): BroadcastDisplay[] {
  const providers = normalizeProviderConfigs(config.providers);
  const subscriptions = new Set(config.subscriptions);
  const out: BroadcastDisplay[] = [];

  for (const b of broadcasts) {
    const input = typeof b === 'string' ? { name: b } : b;
    if (input.name.trim() === '') continue;

    const service = toStreamingKey(input.name);
    if (service) {
      const label = STREAMING_SERVICES[service].label;
      out.push(
        subscriptions.has(service)
          ? { state: 'HAVE', kind: 'STREAMING', service, label, priority: CHIP_PRIORITY.STREAMING }
          : { state: 'MISSING', kind: 'STREAMING', label, reason: 'NOT_SUBSCRIBED' },
      );
      continue;
    }

    const network = toTvNetworkId(input.name);
    if (network) {
      out.push(...resolveTv(network, input.market, providers, config.zip));
      continue;
    }

    out.push({ state: 'UNKNOWN', label: normalizeName(input.name), reason: 'UNRECOGNIZED' });
  }

  const seen = new Set<string>();
  const unique = out.filter((d) => {
    const key = dedupeKey(d);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Array.prototype.sort is stable, so input order breaks ties.
  return unique.sort((a, b) => {
    const byState = STATE_ORDER[a.state] - STATE_ORDER[b.state];
    if (byState !== 0) return byState;
    const pa = a.state === 'HAVE' ? a.priority : 0;
    const pb = b.state === 'HAVE' ? b.priority : 0;
    return pb - pa;
  });
}

export interface CardChips {
  /** Up to `max` HAVE chips, best first. */
  chips: Extract<BroadcastDisplay, { state: 'HAVE' }>[];
  /** HAVE chips not shown ("+N more"). */
  overflow: number;
  /** When there are no HAVE chips: network names for "On X, Y". */
  fallbackLabels: string[];
}

/** GameCard summary: top HAVE chips, or a muted list of networks. */
export function selectCardChips(displays: readonly BroadcastDisplay[], max = 2): CardChips {
  const have = displays.filter(
    (d): d is Extract<BroadcastDisplay, { state: 'HAVE' }> => d.state === 'HAVE',
  );
  if (have.length > 0) {
    return {
      chips: have.slice(0, max),
      overflow: Math.max(0, have.length - max),
      fallbackLabels: [],
    };
  }
  return { chips: [], overflow: 0, fallbackLabels: [...new Set(displays.map((d) => d.label))] };
}

/** True when the user can watch the game somewhere. */
export function isAvailable(displays: readonly BroadcastDisplay[]): boolean {
  return displays.some((d) => d.state === 'HAVE');
}

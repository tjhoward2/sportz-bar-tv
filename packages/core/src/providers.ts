/**
 * TV providers (PRD §7).
 *
 * A provider is how a TV gets its signal: cable/satellite, a live-TV
 * streaming bundle, or an antenna. Users can have several; one is primary.
 */

export const PROVIDER_KEYS = [
  'DIRECTV',
  'XFINITY',
  'DISH',
  'SPECTRUM',
  'COX',
  'FIOS',
  'OPTIMUM',
  'ATT_UVERSE',
  'YTTV',
  'HULU_LIVE',
  'FUBO',
  'SLING',
  'ANTENNA',
  'NONE',
] as const;

export type ProviderKey = (typeof PROVIDER_KEYS)[number];

export type ProviderCategory = 'CABLE_SATELLITE' | 'LIVE_STREAMING' | 'ANTENNA' | 'NONE';

export interface Provider {
  key: ProviderKey;
  label: string;
  /** Compact label for chips, e.g. "DIRECTV CH 206". */
  shortLabel: string;
  category: ProviderCategory;
}

export const PROVIDERS: Readonly<Record<ProviderKey, Provider>> = {
  DIRECTV: { key: 'DIRECTV', label: 'DIRECTV', shortLabel: 'DIRECTV', category: 'CABLE_SATELLITE' },
  XFINITY: {
    key: 'XFINITY',
    label: 'Xfinity / Comcast',
    shortLabel: 'XFINITY',
    category: 'CABLE_SATELLITE',
  },
  DISH: { key: 'DISH', label: 'DISH', shortLabel: 'DISH', category: 'CABLE_SATELLITE' },
  SPECTRUM: {
    key: 'SPECTRUM',
    label: 'Spectrum',
    shortLabel: 'SPECTRUM',
    category: 'CABLE_SATELLITE',
  },
  COX: { key: 'COX', label: 'Cox', shortLabel: 'COX', category: 'CABLE_SATELLITE' },
  FIOS: { key: 'FIOS', label: 'Verizon Fios', shortLabel: 'FIOS', category: 'CABLE_SATELLITE' },
  OPTIMUM: { key: 'OPTIMUM', label: 'Optimum', shortLabel: 'OPTIMUM', category: 'CABLE_SATELLITE' },
  ATT_UVERSE: {
    key: 'ATT_UVERSE',
    label: 'AT&T U-verse',
    shortLabel: 'U-VERSE',
    category: 'CABLE_SATELLITE',
  },
  YTTV: { key: 'YTTV', label: 'YouTube TV', shortLabel: 'YTTV', category: 'LIVE_STREAMING' },
  HULU_LIVE: {
    key: 'HULU_LIVE',
    label: 'Hulu + Live TV',
    shortLabel: 'HULU LIVE',
    category: 'LIVE_STREAMING',
  },
  FUBO: { key: 'FUBO', label: 'Fubo', shortLabel: 'FUBO', category: 'LIVE_STREAMING' },
  SLING: { key: 'SLING', label: 'Sling TV', shortLabel: 'SLING', category: 'LIVE_STREAMING' },
  ANTENNA: { key: 'ANTENNA', label: 'Antenna (OTA)', shortLabel: 'OTA', category: 'ANTENNA' },
  NONE: { key: 'NONE', label: 'No TV service', shortLabel: 'NONE', category: 'NONE' },
};

/** One provider in a user's setup. */
export interface ProviderConfig {
  provider: ProviderKey;
  isPrimary: boolean;
}

export function isProviderKey(value: string): value is ProviderKey {
  return (PROVIDER_KEYS as readonly string[]).includes(value);
}

/**
 * Normalizes a user's provider list: drops duplicates (first wins), drops
 * NONE when real providers exist, and guarantees at most one primary
 * (the first marked primary, else the first provider).
 */
export function normalizeProviderConfigs(configs: readonly ProviderConfig[]): ProviderConfig[] {
  const seen = new Set<ProviderKey>();
  const unique = configs.filter((c) => {
    if (seen.has(c.provider)) return false;
    seen.add(c.provider);
    return true;
  });
  const real = unique.filter((c) => c.provider !== 'NONE');
  const list = real.length > 0 ? real : unique;
  if (list.length === 0) return [];
  const primaryIndex = Math.max(
    0,
    list.findIndex((c) => c.isPrimary),
  );
  return list.map((c, i) => ({ provider: c.provider, isPrimary: i === primaryIndex }));
}

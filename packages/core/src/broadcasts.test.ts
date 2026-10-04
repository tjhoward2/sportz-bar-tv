import { describe, expect, it } from 'vitest';
import {
  isAvailable,
  resolveBroadcasts,
  selectCardChips,
  type BroadcastDisplay,
  type UserTvConfig,
} from './broadcasts';

const bar: UserTvConfig = {
  providers: [
    { provider: 'XFINITY', isPrimary: false },
    { provider: 'DIRECTV', isPrimary: true },
  ],
  subscriptions: ['ESPN_PLUS'],
  zip: '97201',
};

const summary = (d: BroadcastDisplay) =>
  d.state === 'HAVE' && d.kind === 'TV'
    ? `HAVE ${d.providerLabel} ${d.channel}`
    : d.state === 'HAVE'
      ? `HAVE ${d.label}`
      : `${d.state} ${d.label} ${d.reason}`;

describe('resolveBroadcasts', () => {
  it('returns one HAVE per provider carrying the network, primary first', () => {
    const result = resolveBroadcasts(['ESPN'], bar);
    expect(result.map(summary)).toEqual(['HAVE DIRECTV 206', 'HAVE XFINITY 33']);
    expect(result[0]).toMatchObject({ isPrimary: true, priority: 100, channelVerified: false });
    expect(result[1]).toMatchObject({ isPrimary: false, priority: 80 });
  });

  it('resolves streaming against subscriptions', () => {
    expect(resolveBroadcasts(['ESPN+', 'Peacock'], bar).map(summary)).toEqual([
      'HAVE ESPN+',
      'MISSING Peacock NOT_SUBSCRIBED',
    ]);
  });

  it('ranks TV above streaming and HAVE above MISSING above UNKNOWN', () => {
    const result = resolveBroadcasts(['Mystery Net', 'Peacock', 'ESPN+', 'FS1'], bar);
    expect(result.map(summary)).toEqual([
      'HAVE DIRECTV 219',
      'HAVE XFINITY 37',
      'HAVE ESPN+',
      'MISSING Peacock NOT_SUBSCRIBED',
      'UNKNOWN MYSTERY NET UNRECOGNIZED',
    ]);
  });

  it('shows only providers with a confirmed channel', () => {
    // ESPNU: DIRECTV has it; this Xfinity ZIP has no ESPNU entry.
    const result = resolveBroadcasts(['ESPNU'], { ...bar, zip: '97101' });
    expect(result.map(summary)).toEqual(['HAVE DIRECTV 208']);
  });

  it('says CHECK GUIDE (UNKNOWN) rather than guess when no table covers it', () => {
    const result = resolveBroadcasts(['ESPN'], {
      providers: [{ provider: 'DISH', isPrimary: true }],
      subscriptions: [],
    });
    expect(result.map(summary)).toEqual(['UNKNOWN ESPN NO_CHANNEL_DATA']);
  });

  it('marks unresolved regional feeds as REGIONAL', () => {
    const result = resolveBroadcasts([{ name: 'ESPN', market: 'HOME' }], {
      providers: [{ provider: 'SPECTRUM', isPrimary: true }],
      subscriptions: [],
    });
    expect(result.map(summary)).toEqual(['UNKNOWN ESPN REGIONAL']);
  });

  it('is MISSING only when every provider certainly lacks it', () => {
    const antennaOnly: UserTvConfig = {
      providers: [{ provider: 'ANTENNA', isPrimary: true }],
      subscriptions: [],
      zip: '97201',
    };
    expect(resolveBroadcasts(['ESPN', 'ABC'], antennaOnly).map(summary)).toEqual([
      'HAVE OTA 2',
      'MISSING ESPN NOT_CARRIED',
    ]);
    const none: UserTvConfig = {
      providers: [{ provider: 'NONE', isPrimary: true }],
      subscriptions: [],
    };
    expect(resolveBroadcasts(['ESPN'], none).map(summary)).toEqual(['MISSING ESPN NOT_CARRIED']);
  });

  it('is UNKNOWN when the user has not set up providers', () => {
    const result = resolveBroadcasts(['ESPN'], { providers: [], subscriptions: [] });
    expect(result.map(summary)).toEqual(['UNKNOWN ESPN NO_PROVIDERS']);
  });

  it('dedupes spellings of the same network and skips blanks', () => {
    const result = resolveBroadcasts(['ESPN', 'ESPN HD', 'espn', '  ', 'ESPN+', 'ESPN PLUS'], bar);
    expect(result.map(summary)).toEqual(['HAVE DIRECTV 206', 'HAVE XFINITY 33', 'HAVE ESPN+']);
  });
});

describe('selectCardChips', () => {
  it('takes the top 2 HAVE chips and counts the rest', () => {
    const displays = resolveBroadcasts(['ESPN', 'ESPN+', 'Peacock'], bar);
    const { chips, overflow, fallbackLabels } = selectCardChips(displays);
    expect(chips.map(summary)).toEqual(['HAVE DIRECTV 206', 'HAVE XFINITY 33']);
    expect(overflow).toBe(1);
    expect(fallbackLabels).toEqual([]);
  });

  it('falls back to network names when nothing is available', () => {
    const displays = resolveBroadcasts(['Peacock', 'KUNP'], bar);
    expect(selectCardChips(displays)).toEqual({
      chips: [],
      overflow: 0,
      fallbackLabels: ['Peacock', 'KUNP'],
    });
    expect(isAvailable(displays)).toBe(false);
  });

  it('reports availability', () => {
    expect(isAvailable(resolveBroadcasts(['ESPN'], bar))).toBe(true);
  });
});

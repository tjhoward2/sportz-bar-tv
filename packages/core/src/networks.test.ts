import { describe, expect, it } from 'vitest';
import { TV_NETWORK_IDS, TV_NETWORK_LABELS, isLocalBroadcast, toTvNetworkId } from './networks';

describe('toTvNetworkId', () => {
  it.each([
    ['ESPN', 'ESPN'],
    ['espn', 'ESPN'],
    ['ESPN HD', 'ESPN'],
    ['  ESPN   2 ', 'ESPN2'],
    ['FOX SPORTS 1', 'FS1'],
    ['Fox Sports 2', 'FS2'],
    ['truTV', 'TRUTV'],
    ['Tru TV', 'TRUTV'],
    ['NBA TV', 'NBATV'],
    ['NBA TV HD', 'NBATV'],
    ['MLB Network', 'MLBN'],
    // Spellings seen in ESPN's live feed (Oct 2026).
    ['Golf Chnl', 'GOLF'],
    ['USA Net', 'USA'],
    ['NFL Net', 'NFLN'],
    ['NHL Net', 'NHLN'],
    ['Big Ten Network', 'BTN'],
    ['ROOT SPORTS NORTHWEST', 'ROOT_NW'],
    ['KGW-HD', 'NBC'],
    ['KATU-TV', 'ABC'],
    ['KPTV', 'FOX'],
  ] as const)('maps %s to %s', (raw, expected) => {
    expect(toTvNetworkId(raw)).toBe(expected);
  });

  it.each(['KUNP', 'CBSSN', 'ESPN+', 'Peacock', 'MLB.TV', ''])('does not guess for %j', (raw) => {
    expect(toTvNetworkId(raw)).toBeUndefined();
  });

  it('labels every network', () => {
    for (const id of TV_NETWORK_IDS) expect(TV_NETWORK_LABELS[id]).toBeTruthy();
  });

  it('knows which networks are local broadcasts', () => {
    expect(isLocalBroadcast('FOX')).toBe(true);
    expect(isLocalBroadcast('FS1')).toBe(false);
  });
});

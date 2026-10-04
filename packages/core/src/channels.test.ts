import { describe, expect, it } from 'vitest';
import { lookupChannel, marketForZip, zipPrefix } from './channels';

describe('zipPrefix / marketForZip', () => {
  it('accepts 5-digit and ZIP+4', () => {
    expect(zipPrefix('97201')).toBe('972');
    expect(zipPrefix(' 97201-1234 ')).toBe('972');
  });

  it.each([undefined, null, '', '972', '9720', 'abcde', '972011'])('rejects %j', (zip) => {
    expect(zipPrefix(zip)).toBeUndefined();
  });

  it('maps known markets only', () => {
    expect(marketForZip('97101')).toBe('PORTLAND');
    expect(marketForZip('98101')).toBe('SEATTLE');
    expect(marketForZip('10001')).toBeUndefined();
  });
});

describe('lookupChannel', () => {
  it('finds DIRECTV national channels regardless of ZIP', () => {
    expect(lookupChannel('DIRECTV', 'ESPN', undefined)).toEqual({
      kind: 'CHANNEL',
      channel: '206',
      verified: false,
      source: 'NATIONAL',
    });
  });

  it('finds Xfinity channels by ZIP prefix', () => {
    expect(lookupChannel('XFINITY', 'ESPN', '97201')).toMatchObject({ channel: '33' });
  });

  it('is UNKNOWN when Xfinity has no table for the ZIP or network', () => {
    expect(lookupChannel('XFINITY', 'ESPN', '10001')).toEqual({ kind: 'UNKNOWN' });
    expect(lookupChannel('XFINITY', 'ESPN', undefined)).toEqual({ kind: 'UNKNOWN' });
    expect(lookupChannel('XFINITY', 'ESPNU', '97101')).toEqual({ kind: 'UNKNOWN' });
  });

  it('uses market affiliates for locals on DIRECTV, Xfinity and antenna', () => {
    expect(lookupChannel('DIRECTV', 'ABC', '97201')).toMatchObject({ channel: '2' });
    expect(lookupChannel('XFINITY', 'FOX', '97201')).toMatchObject({ channel: '12' });
    expect(lookupChannel('ANTENNA', 'NBC', '98101')).toMatchObject({ channel: '5' });
  });

  it('is UNKNOWN for locals outside known markets or on other providers', () => {
    expect(lookupChannel('DIRECTV', 'ABC', '10001')).toEqual({ kind: 'UNKNOWN' });
    expect(lookupChannel('ANTENNA', 'ABC', undefined)).toEqual({ kind: 'UNKNOWN' });
    expect(lookupChannel('YTTV', 'ABC', '97201')).toEqual({ kind: 'UNKNOWN' });
  });

  it('is NOT_CARRIED only when certain', () => {
    expect(lookupChannel('ANTENNA', 'ESPN', '97201')).toEqual({ kind: 'NOT_CARRIED' });
    expect(lookupChannel('NONE', 'ABC', '97201')).toEqual({ kind: 'NOT_CARRIED' });
  });

  it('never guesses for providers without curated data', () => {
    for (const provider of ['DISH', 'SPECTRUM', 'YTTV', 'FUBO', 'SLING'] as const) {
      expect(lookupChannel(provider, 'ESPN', '97201')).toEqual({ kind: 'UNKNOWN' });
    }
  });
});

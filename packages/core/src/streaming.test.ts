import { describe, expect, it } from 'vitest';
import { STREAMING_KEYS, STREAMING_SERVICES, isStreamingKey, toStreamingKey } from './streaming';

describe('toStreamingKey', () => {
  it.each([
    ['ESPN+', 'ESPN_PLUS'],
    ['espn plus', 'ESPN_PLUS'],
    ['Peacock', 'PEACOCK'],
    ['Amazon Prime Video', 'PRIME_VIDEO'],
    ['Apple TV', 'APPLE_TV'],
    ['Max', 'MAX'],
    ['HBO Max', 'MAX'],
    ['NBA LP', 'NBA_LP'],
    ['MLB.TV', 'MLB_TV'],
    ['NFL Sunday Ticket', 'NFL_ST'],
    ['FloSports', 'FLOSPORTS'],
  ] as const)('maps %s to %s', (raw, expected) => {
    expect(toStreamingKey(raw)).toBe(expected);
  });

  it.each(['ESPN', 'FLORIDA', 'FLO', 'MAXIMUM', 'Paramount Network', ''])(
    'does not match %j',
    (raw) => {
      expect(toStreamingKey(raw)).toBeUndefined();
    },
  );

  it('has no alias claimed by two services', () => {
    const aliases = Object.values(STREAMING_SERVICES).flatMap((s) => s.aliases);
    expect(new Set(aliases).size).toBe(aliases.length);
  });

  it('defines all 15 services', () => {
    expect(STREAMING_KEYS).toHaveLength(15);
    expect(isStreamingKey('PEACOCK')).toBe(true);
    expect(isStreamingKey('peacock')).toBe(false);
  });
});

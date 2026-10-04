import { describe, expect, it } from 'vitest';
import { PROVIDER_KEYS, isProviderKey, normalizeProviderConfigs } from './providers';

describe('providers', () => {
  it('defines 14 providers', () => {
    expect(PROVIDER_KEYS).toHaveLength(14);
    expect(isProviderKey('DIRECTV')).toBe(true);
    expect(isProviderKey('directv')).toBe(false);
  });
});

describe('normalizeProviderConfigs', () => {
  it('keeps exactly one primary: the first one marked', () => {
    expect(
      normalizeProviderConfigs([
        { provider: 'XFINITY', isPrimary: false },
        { provider: 'DIRECTV', isPrimary: true },
        { provider: 'YTTV', isPrimary: true },
      ]),
    ).toEqual([
      { provider: 'XFINITY', isPrimary: false },
      { provider: 'DIRECTV', isPrimary: true },
      { provider: 'YTTV', isPrimary: false },
    ]);
  });

  it('makes the first provider primary when none is marked', () => {
    expect(normalizeProviderConfigs([{ provider: 'XFINITY', isPrimary: false }])).toEqual([
      { provider: 'XFINITY', isPrimary: true },
    ]);
  });

  it('drops duplicates and NONE when real providers exist', () => {
    expect(
      normalizeProviderConfigs([
        { provider: 'NONE', isPrimary: true },
        { provider: 'DIRECTV', isPrimary: false },
        { provider: 'DIRECTV', isPrimary: true },
      ]),
    ).toEqual([{ provider: 'DIRECTV', isPrimary: true }]);
  });

  it('keeps NONE alone and handles empty input', () => {
    expect(normalizeProviderConfigs([{ provider: 'NONE', isPrimary: false }])).toEqual([
      { provider: 'NONE', isPrimary: true },
    ]);
    expect(normalizeProviderConfigs([])).toEqual([]);
  });
});

/**
 * Per-user TV setup: providers, streaming subscriptions, ZIP, timezone,
 * favorite teams. Validated against @sbtv/core's keys on write, and
 * defensively re-validated on read (JSON columns can hold anything).
 */
import {
  PROVIDER_KEYS,
  STREAMING_KEYS,
  normalizeProviderConfigs,
  type ProviderConfig,
  type StreamingKey,
} from '@sbtv/core';
import { z } from 'zod';
import type { Prisma, User } from '@/generated/prisma/client';

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const ProviderConfigSchema = z.object({
  provider: z.enum(PROVIDER_KEYS),
  isPrimary: z.boolean(),
});

export const SettingsSchema = z.object({
  providers: z.array(ProviderConfigSchema).max(PROVIDER_KEYS.length),
  subscriptions: z
    .array(z.enum(STREAMING_KEYS))
    .max(STREAMING_KEYS.length)
    .transform((s) => [...new Set(s)]),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}$/, 'ZIP must be 5 digits.')
    .nullable(),
  timezone: z.string().refine(isValidTimeZone, 'Unknown time zone.'),
  favoriteTeams: z
    .array(z.string().trim().min(2, 'Team names need at least 2 characters.').max(60))
    .max(50)
    .transform((t) => [...new Set(t)]),
});

export interface UserSettings {
  providers: ProviderConfig[];
  subscriptions: StreamingKey[];
  zip: string | null;
  timezone: string;
  favoriteTeams: string[];
}

export function settingsFromUser(user: User): UserSettings {
  const providers = z.array(ProviderConfigSchema).safeParse(user.providersJson);
  const subscriptions = z.array(z.enum(STREAMING_KEYS)).safeParse(user.subscriptionsJson);
  const favorites = z.array(z.string()).safeParse(user.favoriteTeams);
  return {
    providers: normalizeProviderConfigs(providers.success ? providers.data : []),
    subscriptions: subscriptions.success ? subscriptions.data : [],
    zip: user.zip,
    timezone: user.timezone,
    favoriteTeams: favorites.success ? favorites.data : [],
  };
}

export function settingsToUserData(s: z.infer<typeof SettingsSchema>): Prisma.UserUpdateInput {
  return {
    // Spread to plain objects: Prisma's JSON input type needs index signatures.
    providersJson: normalizeProviderConfigs(s.providers).map((p) => ({ ...p })),
    subscriptionsJson: s.subscriptions,
    zip: s.zip,
    timezone: s.timezone,
    favoriteTeams: s.favoriteTeams,
  };
}

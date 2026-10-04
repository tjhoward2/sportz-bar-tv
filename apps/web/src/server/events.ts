/**
 * Glue between the sports adapters, the signed-in user's setup, and the
 * pure pipeline in @sbtv/core.
 */
import type { SportsEvent, UserListConfig } from '@sbtv/core';
import type { User } from '@/generated/prisma/client';
import { settingsFromUser } from './settings';
import { fetchAllEvents, type FeedHealth } from './sports';

export interface FeedSummary {
  /** Leagues whose data could not be loaded at all. */
  failing: string[];
  /** Leagues being served from cache after a failed refresh. */
  stale: string[];
}

export function userListConfig(user: User): UserListConfig {
  const s = settingsFromUser(user);
  return {
    providers: s.providers,
    subscriptions: s.subscriptions,
    zip: s.zip,
    favoriteTeams: s.favoriteTeams,
    timezone: s.timezone,
  };
}

export function summarizeFeeds(feeds: readonly FeedHealth[]): FeedSummary {
  return {
    failing: feeds.filter((f) => !f.ok).map((f) => f.league),
    stale: feeds.filter((f) => f.stale).map((f) => f.league),
  };
}

export async function loadEvents(
  now: Date,
): Promise<{ events: SportsEvent[]; feeds: FeedSummary }> {
  const { events, feeds } = await fetchAllEvents(now);
  return { events, feeds: summarizeFeeds(feeds) };
}

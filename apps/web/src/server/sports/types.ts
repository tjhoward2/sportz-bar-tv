import type { LeagueId, SportsEvent } from '@sbtv/core';

/** Health of one league feed, so the UI can say "data delayed" honestly. */
export interface FeedHealth {
  league: LeagueId;
  ok: boolean;
  /** Served from cache after a failed refresh. */
  stale: boolean;
  eventCount: number;
  /** Oldest data timestamp among this league's requests (ISO). */
  fetchedAt?: string;
  error?: string;
}

export interface AdapterResult {
  events: SportsEvent[];
  feeds: FeedHealth[];
}

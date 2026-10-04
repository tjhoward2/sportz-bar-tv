/**
 * ESPN scoreboard adapter. Fetches one request per league per Eastern day
 * (ESPN's `dates=A-B` range form returned HTTP 400 for every league when
 * tested on 2026-10-04; single days work).
 *
 * Days fetched: yesterday (late games, Scores page) through +2 for regular
 * leagues (48h upcoming window) or +6 for championship leagues (7 days).
 * Today/yesterday refresh every 30s; future days every 10 min in the
 * background. Fail-open: a failing league is reported, never fatal.
 */
import { isChampionshipLeague, type SportsEvent } from '@sbtv/core';
import { log } from '../../log';
import { easternDays } from '../dates';
import { TtlCache, fetchJson, mapLimit, type CacheResult } from '../http';
import type { AdapterResult, FeedHealth } from '../types';
import { ESPN_BASE_URL, ESPN_ENDPOINTS, type EspnEndpoint } from './endpoints';
import { normalizeScoreboard } from './normalize';

const REQUEST_TIMEOUT_MS = 8_000;
const CONCURRENCY = 8;
const LIVE_TTL_MS = 30_000;
const FUTURE_TTL_MS = 10 * 60_000;
const MAX_STALE_MS = 6 * 3_600_000;

const cache = new TtlCache<unknown>();

/** Test hook. */
export function clearEspnCache(): void {
  cache.clear();
}

interface Request {
  ep: EspnEndpoint;
  day: string;
  isFuture: boolean;
}

export function planRequests(now: Date, endpoints = ESPN_ENDPOINTS): Request[] {
  const [, today] = easternDays(now, -1, 0);
  return endpoints.flatMap((ep) => {
    const lastOffset = isChampionshipLeague(ep.league) ? 6 : 2;
    return easternDays(now, -1, lastOffset).map((day) => ({
      ep,
      day,
      isFuture: day > (today ?? ''),
    }));
  });
}

export async function fetchEspnEvents(
  now: Date = new Date(),
  endpoints: readonly EspnEndpoint[] = ESPN_ENDPOINTS,
): Promise<AdapterResult> {
  const requests = planRequests(now, endpoints);
  const results = await mapLimit(requests, CONCURRENCY, (r) =>
    cache.get(
      `${r.ep.path}:${r.day}`,
      () =>
        fetchJson(`${ESPN_BASE_URL}/${r.ep.path}/scoreboard?dates=${r.day}`, REQUEST_TIMEOUT_MS),
      {
        ttlMs: r.isFuture ? FUTURE_TTL_MS : LIVE_TTL_MS,
        maxStaleMs: MAX_STALE_MS,
        staleWhileRevalidate: r.isFuture,
      },
    ),
  );

  const byLeague = new Map<
    EspnEndpoint,
    { results: PromiseSettledResult<CacheResult<unknown>>[] }
  >();
  requests.forEach((r, i) => {
    const entry = byLeague.get(r.ep) ?? { results: [] };
    entry.results.push(results[i] as PromiseSettledResult<CacheResult<unknown>>);
    byLeague.set(r.ep, entry);
  });

  const events = new Map<string, SportsEvent>();
  const feeds: FeedHealth[] = [];
  for (const [ep, { results: leagueResults }] of byLeague) {
    let ok = 0;
    let stale = false;
    let oldest = Infinity;
    let error: string | undefined;
    let count = 0;
    let invalid = 0;
    for (const res of leagueResults) {
      if (res.status === 'rejected') {
        error ??= res.reason instanceof Error ? res.reason.message : String(res.reason);
        continue;
      }
      ok++;
      stale ||= res.value.stale;
      error ??= res.value.error;
      oldest = Math.min(oldest, res.value.fetchedAt);
      const normalized = normalizeScoreboard(ep, res.value.value, now);
      invalid += normalized.invalid;
      for (const e of normalized.events) {
        // Multi-day tournaments appear on several days' boards.
        if (!events.has(e.id)) count++;
        events.set(e.id, e);
      }
    }
    if (invalid > 0) log.warn('espn.invalid_events', { league: ep.league, invalid });
    if (error) log.warn('espn.feed_error', { league: ep.league, error, stale });
    feeds.push({
      league: ep.league,
      ok: ok === leagueResults.length,
      stale,
      eventCount: count,
      fetchedAt: Number.isFinite(oldest) ? new Date(oldest).toISOString() : undefined,
      error,
    });
  }

  return { events: [...events.values()], feeds };
}

/**
 * Triple-A schedule from MLB StatsAPI (no key). One request covers the
 * whole window: yesterday through +2 days (Eastern).
 */
import { log } from '../../log';
import { easternDays } from '../dates';
import { TtlCache, fetchJson } from '../http';
import type { AdapterResult } from '../types';
import { normalizeSchedule } from './normalize';

const BASE_URL = 'https://statsapi.mlb.com/api/v1/schedule';
const AAA_SPORT_ID = 11;
const REQUEST_TIMEOUT_MS = 8_000;

const cache = new TtlCache<unknown>();

/** Test hook. */
export function clearMlbCache(): void {
  cache.clear();
}

const isoDay = (yyyymmdd: string) =>
  `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;

export function scheduleUrl(now: Date): string {
  const days = easternDays(now, -1, 2);
  const params = new URLSearchParams({
    sportId: String(AAA_SPORT_ID),
    startDate: isoDay(days[0] ?? ''),
    endDate: isoDay(days.at(-1) ?? ''),
    hydrate: 'broadcasts,linescore,team',
  });
  return `${BASE_URL}?${params.toString()}`;
}

export async function fetchMlbEvents(now: Date = new Date()): Promise<AdapterResult> {
  const url = scheduleUrl(now);
  try {
    const res = await cache.get(url, () => fetchJson(url, REQUEST_TIMEOUT_MS), {
      ttlMs: 30_000,
      maxStaleMs: 6 * 3_600_000,
    });
    const { events, invalid } = normalizeSchedule(res.value);
    if (invalid > 0) log.warn('mlb.invalid_games', { invalid });
    if (res.error) log.warn('mlb.feed_error', { error: res.error, stale: true });
    return {
      events,
      feeds: [
        {
          league: 'AAA',
          ok: !res.stale,
          stale: res.stale,
          eventCount: events.length,
          fetchedAt: new Date(res.fetchedAt).toISOString(),
          error: res.error,
        },
      ],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    log.warn('mlb.feed_error', { error, stale: false });
    return {
      events: [],
      feeds: [{ league: 'AAA', ok: false, stale: false, eventCount: 0, error }],
    };
  }
}

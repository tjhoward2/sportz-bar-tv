/**
 * Event list pipeline (PRD §11). Pure: events + user config + clock in,
 * ranked list out. The server fetches; this decides.
 *
 * Two views:
 *   buildDashboard()  "What should I tune to?"  live + upcoming, ranked
 *   buildScores()     "What just happened?"     sections incl. finals
 */
import {
  isAvailable,
  resolveBroadcasts,
  selectCardChips,
  type BroadcastDisplay,
  type CardChips,
  type UserTvConfig,
} from './broadcasts';
import type { SportsEvent } from './events';
import { isChampionshipLeague, type SportId } from './sports';
import {
  STATUS_RANK,
  computeDisplayStatus,
  isLiveFamily,
  isStartingFamily,
  isTerminal,
  type DisplayStatus,
} from './status';

export interface EventListItem {
  event: SportsEvent;
  status: DisplayStatus;
  /** Status concluded by the app, not reported by the feed. */
  statusInferred: boolean;
  broadcasts: BroadcastDisplay[];
  chips: CardChips;
  isFavorite: boolean;
  isAvailable: boolean;
}

export interface UserListConfig extends UserTvConfig {
  favoriteTeams: readonly string[];
  /** IANA zone, for "today" on the Scores page. */
  timezone: string;
}

export type StatusFilter = 'ALL' | 'LIVE' | 'UPCOMING';
export type AvailabilityFilter = 'ALL' | 'AVAILABLE';

export interface DashboardFilters {
  sport?: SportId;
  league?: string;
  status?: StatusFilter;
  availability?: AvailabilityFilter;
  /** Upcoming window for regular leagues, hours. Championship leagues get 7 days. */
  windowHours?: number;
}

export const DEFAULT_WINDOW_HOURS = 48;
export const MAX_WINDOW_HOURS = 168;
export const CHAMPIONSHIP_WINDOW_HOURS = 168;
export const SCORES_LOOKBACK_HOURS = 18;

/** Case-insensitive substring match on either team name (PRD §11). */
export function isFavoriteEvent(event: SportsEvent, favorites: readonly string[]): boolean {
  const needles = favorites.map((f) => f.trim().toLowerCase()).filter((f) => f.length >= 2);
  if (needles.length === 0) return false;
  return event.competitors.some((c) => {
    const name = c.name.toLowerCase();
    return needles.some((n) => name.includes(n));
  });
}

export function toListItem(event: SportsEvent, config: UserListConfig, now: Date): EventListItem {
  const status = computeDisplayStatus({
    rawStatus: event.rawStatus,
    sport: event.sport,
    startTime: new Date(event.startTime),
    now,
  });
  const broadcasts = resolveBroadcasts(event.broadcasts, config);
  return {
    event,
    status: status.status,
    statusInferred: status.inferred,
    broadcasts,
    chips: selectCardChips(broadcasts),
    isFavorite: isFavoriteEvent(event, config.favoriteTeams),
    isAvailable: isAvailable(broadcasts),
  };
}

/** Status rank → favorite → available → start time → name. */
export function compareItems(a: EventListItem, b: EventListItem): number {
  return (
    STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
    Number(b.isFavorite) - Number(a.isFavorite) ||
    Number(b.isAvailable) - Number(a.isAvailable) ||
    Date.parse(a.event.startTime) - Date.parse(b.event.startTime) ||
    a.event.name.localeCompare(b.event.name)
  );
}

function matchesStatus(status: DisplayStatus, filter: StatusFilter): boolean {
  if (filter === 'LIVE') return isLiveFamily(status) || status === 'DELAYED';
  if (filter === 'UPCOMING') return !isLiveFamily(status) && status !== 'DELAYED';
  return true;
}

export function buildDashboard(
  events: readonly SportsEvent[],
  config: UserListConfig,
  now: Date,
  filters: DashboardFilters = {},
): EventListItem[] {
  const windowHours = Math.min(
    MAX_WINDOW_HOURS,
    Math.max(1, filters.windowHours ?? DEFAULT_WINDOW_HOURS),
  );
  return (
    events
      .filter((e) => !filters.sport || e.sport === filters.sport)
      .filter((e) => !filters.league || e.league === filters.league)
      // Nothing to tune to: no broadcast listed at all (e.g. tennis qualifiers).
      .filter((e) => e.broadcasts.length > 0)
      .map((e) => toListItem(e, config, now))
      .filter((item) => !isTerminal(item.status))
      .filter((item) => {
        if (item.status !== 'UPCOMING') return true;
        const hours = isChampionshipLeague(item.event.league)
          ? CHAMPIONSHIP_WINDOW_HOURS
          : windowHours;
        return Date.parse(item.event.startTime) - now.getTime() <= hours * 3_600_000;
      })
      .filter((item) => matchesStatus(item.status, filters.status ?? 'ALL'))
      .filter((item) => filters.availability !== 'AVAILABLE' || item.isAvailable)
      .sort(compareItems)
  );
}

export interface ScoresSections {
  liveNow: EventListItem[];
  justEnded: EventListItem[];
  startingSoon: EventListItem[];
  upcomingToday: EventListItem[];
  postponed: EventListItem[];
}

/** Calendar date (YYYY-MM-DD) of an instant in a time zone. */
function dayInZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

export function buildScores(
  events: readonly SportsEvent[],
  config: UserListConfig,
  now: Date,
  filters: { sport?: SportId } = {},
): ScoresSections {
  const since = now.getTime() - SCORES_LOOKBACK_HOURS * 3_600_000;
  const today = dayInZone(now, config.timezone);
  const sections: ScoresSections = {
    liveNow: [],
    justEnded: [],
    startingSoon: [],
    upcomingToday: [],
    postponed: [],
  };

  for (const e of events) {
    if (filters.sport && e.sport !== filters.sport) continue;
    const start = Date.parse(e.startTime);
    const item = toListItem(e, config, now);
    if (isLiveFamily(item.status)) sections.liveNow.push(item);
    else if (isStartingFamily(item.status)) sections.startingSoon.push(item);
    else if (item.status === 'FINAL') {
      if (start >= since) sections.justEnded.push(item);
    } else if (item.status === 'POSTPONED' || item.status === 'CANCELED') {
      if (start >= since && dayInZone(new Date(start), config.timezone) <= today) {
        sections.postponed.push(item);
      }
    } else if (
      item.status === 'UPCOMING' &&
      dayInZone(new Date(start), config.timezone) === today
    ) {
      sections.upcomingToday.push(item);
    }
  }

  sections.liveNow.sort(compareItems);
  sections.startingSoon.sort(compareItems);
  sections.upcomingToday.sort(compareItems);
  // Most recently started first.
  sections.justEnded.sort((a, b) => Date.parse(b.event.startTime) - Date.parse(a.event.startTime));
  sections.postponed.sort(compareItems);
  return sections;
}

/**
 * Display status (PRD §10). Pure: same input, same output.
 *
 * Principles:
 * 1. LIVE needs both signals: the feed says live AND the scheduled start
 *    is near or past. Feeds sometimes report "in progress" early.
 * 2. Without a live signal, status follows the clock in bounded steps,
 *    so a game never sits in "Starting soon" for hours.
 * 3. Terminal states from the feed always win. Anything past its sport's
 *    max duration is auto-FINAL so stale data can't claim LIVE.
 * 4. Statuses the app infers (not reported by the feed) set
 *    `inferred: true` so the UI can say so honestly.
 */

import type { SportId } from './sports';

/** Normalized feed status. Adapters map provider-specific values onto this. */
export type RawEventStatus =
  'SCHEDULED' | 'LIVE' | 'HALFTIME' | 'DELAYED' | 'FINAL' | 'POSTPONED' | 'CANCELED';

export const DISPLAY_STATUSES = [
  'LIVE',
  'HALFTIME',
  'DELAYED',
  'AWAITING_UPDATE',
  'STARTING_SOON',
  'UPCOMING',
  'POSTPONED',
  'CANCELED',
  'FINAL',
] as const;

export type DisplayStatus = (typeof DISPLAY_STATUSES)[number];

/** Sort rank: lower shows higher on screen. */
export const STATUS_RANK: Readonly<Record<DisplayStatus, number>> = {
  LIVE: 0,
  HALFTIME: 1,
  DELAYED: 2,
  AWAITING_UPDATE: 3,
  STARTING_SOON: 4,
  UPCOMING: 5,
  POSTPONED: 6,
  CANCELED: 7,
  FINAL: 8,
};

export const STARTING_SOON_LEAD_MIN = 15;
export const STARTING_SOON_GRACE_MIN = 5;
export const AWAITING_UPDATE_WINDOW_MIN = 30;
export const LIVE_EARLY_TOLERANCE_MIN = 5;

/**
 * Hours after scheduled start before a non-final event is assumed over.
 * Golf and tennis "events" are multi-day tournaments.
 */
export const MAX_LIVE_HOURS: Readonly<Record<SportId, number>> = {
  BASKETBALL: 3,
  FOOTBALL: 4,
  BASEBALL: 5,
  SOFTBALL: 3.5,
  HOCKEY: 3.5,
  SOCCER: 3,
  GOLF: 120,
  MMA: 5,
  BOXING: 5,
  TENNIS: 336,
  RACING: 4,
};

export interface StatusInput {
  rawStatus: RawEventStatus;
  sport: SportId;
  startTime: Date;
  now: Date;
}

export interface StatusResult {
  status: DisplayStatus;
  /** True when the app concluded this without the feed saying so. */
  inferred: boolean;
  /** Human-readable explanation, for debugging and "why" tooltips. */
  reason: string;
  /** Negative once the scheduled start has passed. */
  minutesUntilStart: number;
}

export function computeDisplayStatus({
  rawStatus,
  sport,
  startTime,
  now,
}: StatusInput): StatusResult {
  const minutesUntilStart = (startTime.getTime() - now.getTime()) / 60_000;
  const minutesSinceStart = -minutesUntilStart;
  const result = (status: DisplayStatus, reason: string, inferred = false): StatusResult => ({
    status,
    inferred,
    reason,
    minutesUntilStart,
  });

  if (rawStatus === 'FINAL' || rawStatus === 'POSTPONED' || rawStatus === 'CANCELED') {
    return result(rawStatus, `Feed reports ${rawStatus}`);
  }

  const maxLiveHours = MAX_LIVE_HOURS[sport];
  if (minutesSinceStart > maxLiveHours * 60) {
    return result('FINAL', `More than ${maxLiveHours}h past start; assumed over`, true);
  }

  // A delay can be announced before the scheduled start (e.g. rain), so
  // DELAYED is trusted at any time.
  if (rawStatus === 'DELAYED') return result('DELAYED', 'Feed reports DELAYED');

  const liveSignal = rawStatus === 'LIVE' || rawStatus === 'HALFTIME';
  if (liveSignal && minutesUntilStart <= LIVE_EARLY_TOLERANCE_MIN) {
    return result(rawStatus, `Feed reports ${rawStatus}`);
  }
  const early = liveSignal ? ` (ignored feed ${rawStatus}: start is in the future)` : '';

  if (minutesUntilStart > STARTING_SOON_LEAD_MIN) {
    return result('UPCOMING', `Starts in ${Math.round(minutesUntilStart)}m${early}`);
  }
  if (minutesSinceStart <= STARTING_SOON_GRACE_MIN) {
    return result('STARTING_SOON', `Scheduled start is within window${early}`);
  }
  if (minutesSinceStart <= AWAITING_UPDATE_WINDOW_MIN) {
    return result(
      'AWAITING_UPDATE',
      `${Math.round(minutesSinceStart)}m past start; feed hasn't reported LIVE`,
      true,
    );
  }
  return result(
    'DELAYED',
    `${Math.round(minutesSinceStart)}m past start with no LIVE report; probably delayed`,
    true,
  );
}

export function isTerminal(s: DisplayStatus): boolean {
  return s === 'FINAL' || s === 'POSTPONED' || s === 'CANCELED';
}

export function isLiveFamily(s: DisplayStatus): boolean {
  return s === 'LIVE' || s === 'HALFTIME';
}

/** Around start time but not confirmed live. */
export function isStartingFamily(s: DisplayStatus): boolean {
  return s === 'STARTING_SOON' || s === 'AWAITING_UPDATE' || s === 'DELAYED';
}

/** Not yet live and not over: what the UPCOMING filter shows. */
export function isUpcomingFamily(s: DisplayStatus): boolean {
  return s === 'UPCOMING' || isStartingFamily(s);
}

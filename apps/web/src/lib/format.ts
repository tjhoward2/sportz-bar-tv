/** Display helpers shared by server and client components. */
import type { DisplayStatus } from '@sbtv/core';

export function formatStartTime(iso: string, timeZone: string, now = new Date()): string {
  const d = new Date(iso);
  const day = (x: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(x);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
  if (day(d) === day(now)) return time;
  const tomorrow = new Date(now.getTime() + 86_400_000);
  if (day(d) === day(tomorrow)) return `Tomorrow ${time}`;
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);
  return `${date} · ${time}`;
}

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  LIVE: 'Live',
  HALFTIME: 'Halftime',
  DELAYED: 'Delayed',
  AWAITING_UPDATE: 'Awaiting update',
  STARTING_SOON: 'Starting soon',
  UPCOMING: 'Upcoming',
  POSTPONED: 'Postponed',
  CANCELED: 'Canceled',
  FINAL: 'Final',
};

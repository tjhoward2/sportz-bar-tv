import { SPORTS, getLeague, type EventListItem } from '@sbtv/core';
import clsx from 'clsx';
import Link from 'next/link';
import { formatStartTime } from '@/lib/format';
import { ChannelChip } from './ChannelChip';
import { StatusPill } from './StatusPill';
import { TeamMark } from './TeamMark';

/** Higher score gets the emphasis; ties and non-numeric scores get none. */
function leaderIndex(scores: (string | undefined)[]): number | undefined {
  const nums = scores.map((s) => (s && /^-?\d+$/.test(s) ? Number(s) : NaN));
  if (nums.length !== 2 || nums.some(Number.isNaN) || nums[0] === nums[1]) return undefined;
  return nums[0]! > nums[1]! ? 0 : 1;
}

export function GameCard({ item, timeZone }: { item: EventListItem; timeZone: string }) {
  const { event, status, chips } = item;
  const live = status === 'LIVE' || status === 'HALFTIME';
  const started = status !== 'UPCOMING' && status !== 'STARTING_SOON';
  const league = getLeague(event.league);
  const leader =
    event.shape !== 'TOURNAMENT' && started
      ? leaderIndex(event.competitors.map((c) => c.score))
      : undefined;

  return (
    <Link
      href={`/game/${encodeURIComponent(event.id)}`}
      className={clsx(
        'block rounded-2xl border border-line bg-surface p-4 shadow-card transition-colors hover:bg-surface2',
        'border-l-4',
        live ? 'border-l-live' : item.isFavorite ? 'border-l-suggested' : 'border-l-line',
      )}
    >
      {event.note && <p className="mb-1 truncate text-xs text-muted">{event.note}</p>}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">
          <span aria-hidden>{SPORTS[event.sport].emoji}</span> {league?.label ?? event.league}
          {item.isFavorite && (
            <span className="ml-2 text-suggested" aria-label="favorite">
              ★
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted tabular-nums">
            {started ? event.statusDetail : formatStartTime(event.startTime, timeZone)}
          </span>
          <StatusPill status={status} inferred={item.statusInferred} sport={event.sport} />
        </span>
      </div>

      {event.shape === 'TOURNAMENT' ? (
        <div>
          <p className="text-lg font-bold">{event.name}</p>
          {started && event.competitors.length > 0 && (
            <ol className="mt-1 text-sm text-muted">
              {event.competitors.slice(0, 3).map((c, i) => (
                <li key={c.id} className="flex justify-between">
                  <span>
                    {i + 1}. {c.shortName}
                  </span>
                  {c.score && <span className="tabular-nums">{c.score}</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {event.competitors.slice(0, 2).map((c, i) => (
            <li key={c.id} className="flex items-center gap-3">
              <TeamMark name={c.shortName} logoUrl={c.logoUrl} />
              <span
                className={clsx(
                  'flex-1 truncate text-lg',
                  leader === i ? 'font-bold' : 'font-medium',
                )}
              >
                {c.shortName}
                {c.record && (
                  <span className="ml-2 text-xs font-normal text-muted">{c.record}</span>
                )}
              </span>
              {started && c.score && (
                <span
                  className={clsx(
                    'text-2xl tabular-nums',
                    leader === i ? 'font-bold' : 'text-muted',
                  )}
                >
                  {c.score}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {chips.chips.map((d, i) => (
          <ChannelChip key={i} display={d} size="sm" />
        ))}
        {chips.overflow > 0 && <span className="text-xs text-muted">+{chips.overflow} more</span>}
        {chips.chips.length === 0 && chips.fallbackLabels.length > 0 && (
          <span className="text-sm text-muted">On {chips.fallbackLabels.join(', ')}</span>
        )}
      </div>
    </Link>
  );
}

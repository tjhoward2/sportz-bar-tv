import type { DisplayStatus, SportId } from '@sbtv/core';
import clsx from 'clsx';
import { STATUS_LABEL } from '@/lib/format';

export function StatusPill({
  status,
  inferred,
  sport,
}: {
  status: DisplayStatus;
  inferred?: boolean;
  sport?: SportId;
}) {
  const live = status === 'LIVE';
  // An app-inferred delay is "no update", not a confirmed delay.
  const label =
    status === 'DELAYED' && inferred
      ? 'No update'
      : status === 'HALFTIME' && sport === 'GOLF'
        ? 'Between rounds'
        : STATUS_LABEL[status];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide',
        live && 'bg-live text-white',
        (status === 'HALFTIME' || status === 'DELAYED' || status === 'AWAITING_UPDATE') &&
          'bg-suggested/20 text-suggested',
        status === 'STARTING_SOON' && 'bg-suggested text-black',
        status === 'UPCOMING' && 'bg-surface2 text-muted',
        (status === 'FINAL' || status === 'POSTPONED' || status === 'CANCELED') &&
          'bg-cleared/30 text-muted',
      )}
    >
      {live && <span aria-hidden className="live-dot size-2 rounded-full bg-white" />}
      {label}
    </span>
  );
}

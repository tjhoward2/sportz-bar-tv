import type { BroadcastDisplay } from '@sbtv/core';
import clsx from 'clsx';

const SIZE = {
  sm: 'min-h-8 px-2 text-xs',
  md: 'min-h-10 px-3 text-sm',
  lg: 'min-h-12 px-4 text-base',
} as const;

/**
 * One broadcast option. Confidence is always visible (design principle 1):
 * green = you have it (channel only from curated tables), muted = you
 * don't, dashed = unknown, check your guide.
 */
export function ChannelChip({
  display,
  size = 'md',
}: {
  display: BroadcastDisplay;
  size?: keyof typeof SIZE;
}) {
  const base = clsx('inline-flex items-center gap-1.5 rounded-xl border font-semibold', SIZE[size]);

  if (display.state === 'HAVE' && display.kind === 'TV') {
    return (
      <span
        className={clsx(base, 'border-confirmed/50 bg-confirmed/15 text-text')}
        title={
          display.channelVerified
            ? undefined
            : 'Channel number from our table; not yet confirmed on your TVs.'
        }
      >
        <span aria-hidden className="text-confirmed">
          ✓
        </span>
        <span>{display.providerLabel}</span>
        <span className="tabular-nums">
          CH {display.channel}
          {!display.channelVerified && (
            <span className="text-muted" aria-label="unverified">
              *
            </span>
          )}
        </span>
        <span className="font-normal text-muted">{display.label}</span>
      </span>
    );
  }
  if (display.state === 'HAVE') {
    return (
      <span className={clsx(base, 'border-confirmed/50 bg-confirmed/15 text-text')}>
        <span aria-hidden className="text-confirmed">
          ✓
        </span>
        {display.label}
      </span>
    );
  }
  if (display.state === 'MISSING') {
    return (
      <span className={clsx(base, 'border-line bg-surface2 font-normal text-muted')}>
        {display.label}
      </span>
    );
  }
  return (
    <span className={clsx(base, 'border-dashed border-muted font-normal text-muted')}>
      <span className="font-semibold">CHECK GUIDE</span> {display.label}
    </span>
  );
}

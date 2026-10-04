import { getLeague } from '@sbtv/core';

export interface Feeds {
  failing: string[];
  stale: string[];
}

const label = (id: string) => getLeague(id)?.label ?? id;

/**
 * Honest data-freshness notice. Stale data always shows a banner. A single
 * failing league (often off-season) only gets a footnote; several failing
 * at once means something systemic, so it gets the banner.
 */
export function FeedBanner({ feeds }: { feeds: Feeds }) {
  const systemic = feeds.failing.length >= 3;
  if (feeds.stale.length > 0 || systemic) {
    const leagues = [...new Set([...feeds.stale, ...(systemic ? feeds.failing : [])])];
    return (
      <div
        role="status"
        className="rounded-xl border border-suggested/50 bg-suggested/10 px-4 py-3 text-sm"
      >
        <strong className="text-suggested">Some data may be out of date.</strong>{' '}
        <span className="text-muted">Couldn&apos;t refresh: {leagues.map(label).join(', ')}.</span>
      </div>
    );
  }
  return null;
}

export function FeedFootnote({ feeds }: { feeds: Feeds }) {
  if (feeds.failing.length === 0 || feeds.failing.length >= 3) return null;
  return (
    <p className="text-xs text-muted">
      Not loading right now: {feeds.failing.map(label).join(', ')}.
    </p>
  );
}

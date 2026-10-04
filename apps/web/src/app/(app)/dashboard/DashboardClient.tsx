'use client';

import { useRouter } from 'next/navigation';
import type { EventListItem } from '@sbtv/core';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FeedBanner, FeedFootnote, type Feeds } from '@/components/FeedBanner';
import { FilterBar, type Filters } from '@/components/FilterBar';
import { GameCard } from '@/components/GameCard';
import { filtersToQuery } from '@/lib/filters';
import { usePolling } from '@/lib/usePolling';

interface Props {
  initialItems: EventListItem[];
  initialFeeds: Feeds;
  initialFilters: Filters;
  timeZone: string;
  hasProviders: boolean;
}

function group(items: EventListItem[]) {
  const live: EventListItem[] = [];
  const soon: EventListItem[] = [];
  const upcoming: EventListItem[] = [];
  for (const i of items) {
    // A feed-reported delay is a live game paused; an inferred one is a
    // game that should have started.
    if (
      i.status === 'LIVE' ||
      i.status === 'HALFTIME' ||
      (i.status === 'DELAYED' && !i.statusInferred)
    ) {
      live.push(i);
    } else if (i.status === 'UPCOMING') upcoming.push(i);
    else soon.push(i);
  }
  return { live, soon, upcoming };
}

function Section({
  title,
  items,
  timeZone,
}: {
  title: string;
  items: EventListItem[];
  timeZone: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
        {title} <span className="font-normal">({items.length})</span>
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <GameCard key={item.event.id} item={item} timeZone={timeZone} />
        ))}
      </div>
    </section>
  );
}

export function DashboardClient({
  initialItems,
  initialFeeds,
  initialFilters,
  timeZone,
  hasProviders,
}: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [items, setItems] = useState(initialItems);
  const [feeds, setFeeds] = useState(initialFeeds);
  const [loading, setLoading] = useState(false); // filter change: full swap
  const [refreshing, setRefreshing] = useState(false); // background poll
  const [error, setError] = useState<string>();
  const latest = useRef(0);

  const load = useCallback(
    async (f: Filters, mode: 'loading' | 'refreshing') => {
      const id = ++latest.current;
      if (mode === 'loading') setLoading(true);
      else setRefreshing(true);
      try {
        const res = await fetch(`/api/events${filtersToQuery(f)}`, { cache: 'no-store' });
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { items: EventListItem[]; feeds: Feeds };
        // Ignore responses that arrive after a newer request started.
        if (id !== latest.current) return;
        setItems(body.items);
        setFeeds(body.feeds);
        setError(undefined);
      } catch {
        if (id === latest.current) setError("Couldn't refresh. Showing the last list we had.");
      } finally {
        if (id === latest.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [router],
  );

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.history.replaceState(null, '', `/dashboard${filtersToQuery(filters)}`);
    void load(filters, 'loading');
  }, [filters, load]);

  usePolling(() => void load(filters, 'refreshing'));

  const { live, soon, upcoming } = group(items);

  return (
    <div className="space-y-4">
      <FilterBar value={filters} onChange={setFilters} />
      {!hasProviders && (
        <div className="rounded-xl border border-overridden/50 bg-overridden/10 px-4 py-3 text-sm">
          Add your TV providers in{' '}
          <Link href="/setup" className="font-semibold underline">
            Setup
          </Link>{' '}
          to see exact channels.
        </div>
      )}
      <FeedBanner feeds={feeds} />
      {error && (
        <p role="alert" className="text-sm text-suggested">
          {error}
        </p>
      )}
      <div aria-busy={loading} className={loading ? 'opacity-50 transition-opacity' : undefined}>
        {items.length === 0 ? (
          <p className="py-16 text-center text-muted">
            {loading ? 'Loading…' : 'No games match these filters right now.'}
          </p>
        ) : (
          <div className="space-y-8">
            <Section title="Live now" items={live} timeZone={timeZone} />
            <Section title="Starting soon" items={soon} timeZone={timeZone} />
            <Section title="Upcoming" items={upcoming} timeZone={timeZone} />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-4">
        <FeedFootnote feeds={feeds} />
        <p className="text-xs text-muted" aria-live="polite">
          {refreshing ? 'Refreshing…' : 'Updates every 30 seconds'}
        </p>
      </div>
      <p className="text-xs text-muted">* Channel numbers are not yet confirmed on your TVs.</p>
    </div>
  );
}

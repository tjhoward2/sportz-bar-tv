'use client';

import { useRouter } from 'next/navigation';
import { SPORT_IDS, SPORTS, type ScoresSections, type SportId } from '@sbtv/core';
import clsx from 'clsx';
import { useCallback, useState } from 'react';
import { FeedBanner, type Feeds } from '@/components/FeedBanner';
import { GameCard } from '@/components/GameCard';
import { usePolling } from '@/lib/usePolling';

const SECTIONS: { key: keyof ScoresSections; title: string }[] = [
  { key: 'liveNow', title: 'Live now' },
  { key: 'justEnded', title: 'Just ended' },
  { key: 'startingSoon', title: 'Starting soon' },
  { key: 'upcomingToday', title: 'Later today' },
  { key: 'postponed', title: 'Postponed / canceled' },
];

interface Props {
  initialSections: ScoresSections;
  initialFeeds: Feeds;
  initialSport?: SportId;
  timeZone: string;
}

export function ScoresClient({ initialSections, initialFeeds, initialSport, timeZone }: Props) {
  const router = useRouter();
  const [sport, setSport] = useState(initialSport);
  const [sections, setSections] = useState(initialSections);
  const [feeds, setFeeds] = useState(initialFeeds);

  const load = useCallback(
    async (s: SportId | undefined) => {
      const res = await fetch(`/api/scores${s ? `?sport=${s}` : ''}`, { cache: 'no-store' });
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      if (!res.ok) return; // keep showing the last good data
      const body = (await res.json()) as { sections: ScoresSections; feeds: Feeds };
      setSections(body.sections);
      setFeeds(body.feeds);
    },
    [router],
  );

  usePolling(() => void load(sport));

  function pick(s: SportId | undefined) {
    setSport(s);
    window.history.replaceState(null, '', `/scores${s ? `?sport=${s}` : ''}`);
    void load(s);
  }

  const total = SECTIONS.reduce((n, s) => n + sections[s.key].length, 0);

  return (
    <div className="space-y-6">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {[undefined, ...SPORT_IDS].map((id) => (
          <button
            key={id ?? 'all'}
            type="button"
            aria-pressed={sport === id}
            onClick={() => pick(id)}
            className={clsx(
              'tap shrink-0 rounded-xl border px-4 text-sm font-semibold',
              sport === id ? 'border-text bg-text text-bg' : 'border-line bg-surface',
            )}
          >
            {id ? `${SPORTS[id].emoji} ${SPORTS[id].label}` : 'All sports'}
          </button>
        ))}
      </div>
      <FeedBanner feeds={feeds} />
      {total === 0 && <p className="py-16 text-center text-muted">Nothing in the last 18 hours.</p>}
      {SECTIONS.map(({ key, title }) =>
        sections[key].length === 0 ? null : (
          <section key={key} className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
              {title} <span className="font-normal">({sections[key].length})</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sections[key].map((item) => (
                <GameCard key={item.event.id} item={item} timeZone={timeZone} />
              ))}
            </div>
          </section>
        ),
      )}
    </div>
  );
}

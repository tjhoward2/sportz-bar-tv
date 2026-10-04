'use client';

import {
  SPORT_IDS,
  SPORTS,
  leaguesForSport,
  type AvailabilityFilter,
  type SportId,
  type StatusFilter,
} from '@sbtv/core';
import clsx from 'clsx';

export interface Filters {
  status: StatusFilter;
  availability: AvailabilityFilter;
  sport?: SportId;
  league?: string;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        'tap shrink-0 rounded-xl border px-4 text-sm font-semibold',
        active
          ? 'border-text bg-text text-bg'
          : 'border-line bg-surface text-text hover:bg-surface2',
      )}
    >
      {children}
    </button>
  );
}

export function FilterBar({ value, onChange }: { value: Filters; onChange: (f: Filters) => void }) {
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
  return (
    <div className="sticky top-[57px] z-20 -mx-4 space-y-2 border-b border-line bg-bg/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
        <Chip active={value.status === 'ALL'} onClick={() => set({ status: 'ALL' })}>
          All
        </Chip>
        <Chip active={value.status === 'LIVE'} onClick={() => set({ status: 'LIVE' })}>
          <span className="flex items-center gap-2">
            <span aria-hidden className="live-dot size-2 rounded-full bg-live" /> Live
          </span>
        </Chip>
        <Chip active={value.status === 'UPCOMING'} onClick={() => set({ status: 'UPCOMING' })}>
          Upcoming
        </Chip>
        <span className="hidden flex-1 sm:block" />
        <Chip
          active={value.availability === 'AVAILABLE'}
          onClick={() =>
            set({ availability: value.availability === 'AVAILABLE' ? 'ALL' : 'AVAILABLE' })
          }
        >
          ✓ I have it
        </Chip>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        <Chip active={!value.sport} onClick={() => set({ sport: undefined, league: undefined })}>
          All sports
        </Chip>
        {SPORT_IDS.map((id) => (
          <Chip
            key={id}
            active={value.sport === id}
            onClick={() => set({ sport: id, league: undefined })}
          >
            <span aria-hidden>{SPORTS[id].emoji}</span> {SPORTS[id].label}
          </Chip>
        ))}
      </div>
      {value.sport && leaguesForSport(value.sport).length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          <Chip active={!value.league} onClick={() => set({ league: undefined })}>
            All {SPORTS[value.sport].label}
          </Chip>
          {leaguesForSport(value.sport).map((l) => (
            <Chip key={l.id} active={value.league === l.id} onClick={() => set({ league: l.id })}>
              {l.label}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

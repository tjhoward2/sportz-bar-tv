import { SPORTS, getLeague, toListItem } from '@sbtv/core';
import Link from 'next/link';
import { ChannelChip } from '@/components/ChannelChip';
import { StatusPill } from '@/components/StatusPill';
import { TeamMark } from '@/components/TeamMark';
import { formatStartTime } from '@/lib/format';
import { requireUser } from '@/server/auth/current';
import { loadEvents, userListConfig } from '@/server/events';

export const dynamic = 'force-dynamic';

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = decodeURIComponent((await params).id);
  const config = userListConfig(user);
  const now = new Date();
  const { events } = await loadEvents(now);
  const event = events.find((e) => e.id === id);

  if (!event) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-semibold">Game not found</p>
        <p className="mt-1 text-muted">It may have ended and dropped off the schedule.</p>
        <Link
          href="/dashboard"
          className="tap mt-6 inline-flex items-center rounded-xl bg-surface2 px-5 font-semibold"
        >
          Back to games
        </Link>
      </div>
    );
  }

  const item = toListItem(event, config, now);
  const have = item.broadcasts.filter((b) => b.state === 'HAVE');
  const other = item.broadcasts.filter((b) => b.state !== 'HAVE');
  const started = item.status !== 'UPCOMING' && item.status !== 'STARTING_SOON';

  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <Link href="/dashboard" className="text-sm text-muted hover:text-text">
        ← Games
      </Link>
      <header className="space-y-2">
        <p className="text-sm text-muted">
          {SPORTS[event.sport].emoji} {getLeague(event.league)?.label ?? event.league}
          {event.note ? ` · ${event.note}` : ''}
        </p>
        <h1 className="text-3xl font-bold">{event.name}</h1>
        <div className="flex items-center gap-3">
          <StatusPill status={item.status} inferred={item.statusInferred} sport={event.sport} />
          <span className="text-sm text-muted">
            {started ? event.statusDetail : formatStartTime(event.startTime, config.timezone)}
          </span>
        </div>
      </header>

      {event.competitors.length > 0 && (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {event.competitors.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-4">
              <TeamMark name={c.shortName} logoUrl={c.logoUrl} />
              <span className="flex-1 text-lg font-semibold">
                {c.name}
                {c.record && (
                  <span className="ml-2 text-sm font-normal text-muted">{c.record}</span>
                )}
              </span>
              {started && c.score && (
                <span className="text-2xl font-bold tabular-nums">{c.score}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Where to watch</h2>
        {have.length > 0 ? (
          <div className="flex flex-col gap-2">
            {have.map((b, i) => (
              <ChannelChip key={i} display={b} size="lg" />
            ))}
          </div>
        ) : (
          <p className="text-muted">Not on any of your providers or services.</p>
        )}
        {other.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {other.map((b, i) => (
              <ChannelChip key={i} display={b} size="sm" />
            ))}
          </div>
        )}
        {have.some((b) => b.state === 'HAVE' && b.kind === 'TV' && !b.channelVerified) && (
          <p className="text-xs text-muted">* Channel numbers are not yet confirmed on your TVs.</p>
        )}
      </section>

      {event.venue && (
        <p className="text-sm text-muted">
          {event.venue.name}
          {event.venue.city ? ` · ${event.venue.city}` : ''}
          {event.venue.state ? `, ${event.venue.state}` : ''}
        </p>
      )}
      {event.lastPlay && <p className="text-sm text-muted">Last play: {event.lastPlay}</p>}
    </article>
  );
}

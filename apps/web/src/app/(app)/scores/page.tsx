import { buildScores, isSportId } from '@sbtv/core';
import type { Metadata } from 'next';
import { requireUser } from '@/server/auth/current';
import { loadEvents, userListConfig } from '@/server/events';
import { ScoresClient } from './ScoresClient';

export const metadata: Metadata = { title: 'Scores · Sportz Bar TV' };
export const dynamic = 'force-dynamic';

export default async function ScoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const raw = (await searchParams).sport;
  const sport = typeof raw === 'string' && isSportId(raw) ? raw : undefined;
  const config = userListConfig(user);
  const now = new Date();
  const { events, feeds } = await loadEvents(now);
  return (
    <ScoresClient
      initialSections={buildScores(events, config, now, { sport })}
      initialFeeds={feeds}
      initialSport={sport}
      timeZone={config.timezone}
    />
  );
}

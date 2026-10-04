import { buildDashboard } from '@sbtv/core';
import type { Metadata } from 'next';
import { parseFilters } from '@/lib/filters';
import { requireUser } from '@/server/auth/current';
import { loadEvents, userListConfig } from '@/server/events';
import { DashboardClient } from './DashboardClient';

export const metadata: Metadata = { title: 'Games · Sportz Bar TV' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const filters = parseFilters(await searchParams);
  const config = userListConfig(user);
  const now = new Date();
  const { events, feeds } = await loadEvents(now);
  const items = buildDashboard(events, config, now, filters);
  return (
    <DashboardClient
      initialItems={items}
      initialFeeds={feeds}
      initialFilters={filters}
      timeZone={config.timezone}
      hasProviders={config.providers.length > 0}
    />
  );
}

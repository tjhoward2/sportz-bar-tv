import { toListItem } from '@sbtv/core';
import { ApiError, json, route } from '@/server/api';
import { requireAuthIdentity } from '@/server/auth/identity';
import { loadEvents, userListConfig } from '@/server/events';

export const dynamic = 'force-dynamic';

/** Game detail: one event with every broadcast resolved for this user. */
export const GET = route<{ params: Promise<{ id: string }> }>('events.get', async (req, ctx) => {
  const { user } = await requireAuthIdentity(req);
  const { id } = await ctx.params;
  const eventId = decodeURIComponent(id);
  const now = new Date();
  const { events, feeds } = await loadEvents(now);
  const event = events.find((e) => e.id === eventId);
  if (!event) throw new ApiError(404, 'NOT_FOUND', 'Game not found. It may have ended.');
  return json({
    generatedAt: now.toISOString(),
    item: toListItem(event, userListConfig(user), now),
    feeds,
  });
});

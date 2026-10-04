import { SPORT_IDS, buildDashboard } from '@sbtv/core';
import { z } from 'zod';
import { ApiError, json, route } from '@/server/api';
import { requireAuthIdentity } from '@/server/auth/identity';
import { loadEvents, userListConfig } from '@/server/events';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const Query = z.object({
  sport: z.enum(SPORT_IDS).optional(),
  league: z.string().max(40).optional(),
  status: z.enum(['ALL', 'LIVE', 'UPCOMING']).default('ALL'),
  availability: z.enum(['ALL', 'AVAILABLE']).default('ALL'),
  window: z.coerce.number().int().min(1).max(168).optional(),
});

/** Dashboard: what should be on right now, ranked for this user. */
export const GET = route('events.list', async (req) => {
  const { user } = await requireAuthIdentity(req);
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const q = Query.safeParse(params);
  if (!q.success) {
    throw new ApiError(400, 'INVALID_INPUT', q.error.issues[0]?.message ?? 'Bad query.');
  }
  const now = new Date();
  const { events, feeds } = await loadEvents(now);
  const items = buildDashboard(events, userListConfig(user), now, {
    sport: q.data.sport,
    league: q.data.league,
    status: q.data.status,
    availability: q.data.availability,
    windowHours: q.data.window,
  });
  return json({ generatedAt: now.toISOString(), items, feeds });
});

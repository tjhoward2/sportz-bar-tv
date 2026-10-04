import { SPORT_IDS, buildScores } from '@sbtv/core';
import { z } from 'zod';
import { ApiError, json, route } from '@/server/api';
import { requireAuthIdentity } from '@/server/auth/identity';
import { loadEvents, userListConfig } from '@/server/events';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const Query = z.object({ sport: z.enum(SPORT_IDS).optional() });

/** Scores page: live, just ended, starting soon, later today, postponed. */
export const GET = route('scores.list', async (req) => {
  const { user } = await requireAuthIdentity(req);
  const q = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) throw new ApiError(400, 'INVALID_INPUT', 'Unknown sport.');
  const now = new Date();
  const { events, feeds } = await loadEvents(now);
  const sections = buildScores(events, userListConfig(user), now, { sport: q.data.sport });
  return json({ generatedAt: now.toISOString(), sections, feeds });
});

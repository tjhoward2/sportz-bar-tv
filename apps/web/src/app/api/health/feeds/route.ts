// Data-feed health: which leagues loaded, which failed, which are stale.
// No user data. Exists mainly to catch ESPN blocking our servers (the old
// app's worst outage). Upstream calls are cached, so polling is cheap.
import { fetchAllEvents } from '@/server/sports';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(): Promise<Response> {
  const { events, feeds } = await fetchAllEvents();
  const failing = feeds.filter((f) => !f.ok).map((f) => f.league);
  const stale = feeds.filter((f) => f.stale).map((f) => f.league);
  const status = failing.length === feeds.length ? 'down' : failing.length > 0 ? 'degraded' : 'ok';
  return Response.json(
    { status, eventCount: events.length, failing, stale, feeds },
    { status: status === 'down' ? 503 : 200, headers: { 'Cache-Control': 'no-store' } },
  );
}

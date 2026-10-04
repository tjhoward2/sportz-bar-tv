// Liveness probe for uptime monitors and deploy checks. Deliberately touches
// no external services, so it stays green when ESPN or the DB is down.
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json(
    {
      status: 'ok',
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      time: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

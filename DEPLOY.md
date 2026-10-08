# Deploying

Hosting: **Vercel** (app) + **Neon** (Postgres). `main` → production, `dev` → preview.

## One-time setup

```bash
VERCEL_TOKEN=... NEON_API_KEY=... node scripts/provision-hosting.mjs
```

Creates the Neon project and Vercel project (root `apps/web`), sets
`DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `JWT_SECRET` for production
and preview, and deploys `dev`. Safe to re-run; it never prints secrets and
keeps existing auth secrets so sessions survive.

The Vercel account must have the Vercel GitHub app installed with access to
`tjhoward2/sportz-bar-tv`.

## Every deploy

Vercel runs `npm run build:vercel` (`apps/web/vercel.json`):
`prisma migrate deploy` → `prisma generate` → `next build`. Migrations must be
backward compatible with the previous release (see CLAUDE.md).

## After deploying, check

1. `GET /api/health` → `{"status":"ok"}`
2. `GET /api/health/feeds` → `ok` or `degraded` (off-season leagues). `down`
   means ESPN is blocking Vercel: the old app's worst outage.
3. Sign up at `/signup`, add providers in Setup, confirm the dashboard shows
   channels.

# Sportz Bar TV

Tells bartenders which game to put on, on which provider and channel — right now.
Built for a 15+ TV sports bar in Oregon running DIRECTV for Business and Xfinity.

## Layout

| Path            | What                                                             |
| --------------- | ---------------------------------------------------------------- |
| `apps/web`      | Next.js web app + API (deployed to Vercel)                       |
| `apps/mobile`   | Expo / React Native iOS app ("Sportz Bar TV")                    |
| `packages/core` | Shared domain logic used by both apps (no UI, no Node-only APIs) |

## Requirements

- Node 22 (`nvm use` reads `.nvmrc`)
- npm 10

## Common commands

```bash
npm install          # install everything (all workspaces)
npm run dev:web      # web app at http://localhost:3000
npm run dev:mobile   # Expo dev server (open in Expo Go / iOS simulator)
npm run check        # format check, lint, typecheck, tests — run before pushing
npm run build        # production build of the web app
```

Health check: `GET /api/health` returns `{"status":"ok", ...}`.

## Local database

```bash
# Postgres 16 on localhost:5432 (Docker example)
docker run -d --name sbtv-pg -p 5432:5432 -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16
createdb -h localhost -U postgres sbtv_dev
createdb -h localhost -U postgres sbtv_test

cp .env.example apps/web/.env.local   # then fill in the secrets
npm run db:migrate                    # apply migrations
npm run db:seed                       # demo bar + 3 accounts
TEST_DATABASE_URL=postgresql://postgres@localhost:5432/sbtv_test npm run test:db
```

Demo accounts (local only): `owner@cascade.bar`, `manager@cascade.bar`,
`bartender@cascade.bar`, password `cascade-demo-1234`.

## Environment variables

See `.env.example`. Copy it to `apps/web/.env.local` for local development.
Never commit real values.

## Contributing

See `CLAUDE.md` for the branch model (`dev` → `main`) and architecture rules.

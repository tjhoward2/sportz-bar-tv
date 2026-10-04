# Working rules for Claude

Read before touching git, GitHub or dependencies in this repo.

## Branches

- **`main`** — production. Vercel deploys it.
- **`dev`** — staging. Every change lands here first.

## Flow for any change

1. `git fetch origin`
2. `git checkout -b claude/<short-name> origin/dev`
3. Make the change. Run `npm run check` (format, lint, typecheck, tests) and
   `npm run build` before pushing. Both must pass.
4. Push and open a PR with **base `dev`**.
5. CI must be green before asking for review.
6. Promotion `dev → main` happens only when the user asks ("promote dev").

## Never

- Open a PR against `main` except a user-requested `dev → main` promotion.
- Merge to `main` directly, or force-push / rebase `main` or `dev`.
- Commit secrets. Real values live in Vercel env vars and `apps/web/.env.local`
  (gitignored). `.env.example` documents every variable.
- Skip, disable or weaken a test to get CI green.

## Architecture rules

- `packages/core` holds all domain logic (taxonomy, channel tables, broadcast
  resolution, status computation, ranking). It must stay platform-agnostic:
  no React, no Next, no Expo, no Node built-ins. ESLint enforces this.
- Web and mobile are thin UIs over `core` + the web API. If logic would be
  duplicated across apps, it belongs in `core`.
- External data sources (ESPN, MLB StatsAPI) live behind adapters in the web
  app. Nothing outside an adapter knows their payload shapes.
- Never display a channel number that isn't in a curated table. Unknown means
  "CHECK GUIDE", not a guess.

## Dependencies

- Versions are pinned exactly (`save-exact`).
- React / React Native / Expo versions follow the Expo SDK. Upgrade them
  together with `npx expo install --fix` in `apps/mobile`, never piecemeal.
- TypeScript stays on 6.x until `typescript-eslint` supports 7.

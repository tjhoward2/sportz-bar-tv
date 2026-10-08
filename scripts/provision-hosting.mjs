#!/usr/bin/env node
/**
 * One-time hosting setup: Neon Postgres + Vercel project, wired together.
 *
 *   VERCEL_TOKEN=... NEON_API_KEY=... node scripts/provision-hosting.mjs
 *
 * Idempotent: reuses an existing Neon project / Vercel project with the
 * same name. Prints names and URLs only; never prints secrets.
 *
 * What it does:
 *   1. Neon: project "sportz-bar-tv" (Postgres 16, us-west-2, near the bar)
 *   2. Vercel: project "sportz-bar-tv" linked to the GitHub repo,
 *      root directory apps/web, production branch main
 *   3. Env vars (production + preview): DATABASE_URL (pooled),
 *      DIRECT_URL (direct, for migrations), SESSION_SECRET, JWT_SECRET
 *   4. Triggers a deployment of the `dev` branch
 */
/* eslint-disable no-console -- CLI script: stdout is its interface */
import { randomBytes } from 'node:crypto';

const NAME = 'sportz-bar-tv';
const REPO = { org: 'tjhoward2', repo: 'sportz-bar-tv' };
const NEON = 'https://console.neon.tech/api/v2';
const VERCEL = 'https://api.vercel.com';

const { VERCEL_TOKEN, NEON_API_KEY, VERCEL_TEAM_ID } = process.env;
if (!VERCEL_TOKEN || !NEON_API_KEY) {
  console.error('Set VERCEL_TOKEN and NEON_API_KEY first.');
  process.exit(1);
}

async function api(base, token, path, init = {}) {
  const team =
    base === VERCEL && VERCEL_TEAM_ID
      ? `${path.includes('?') ? '&' : '?'}teamId=${VERCEL_TEAM_ID}`
      : '';
  const res = await fetch(`${base}${path}${team}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(
      `${init.method ?? 'GET'} ${path} → ${res.status}: ${JSON.stringify(body.error ?? body.message ?? body).slice(0, 300)}`,
    );
    err.status = res.status;
    throw err;
  }
  return body;
}
const neon = (path, init) => api(NEON, NEON_API_KEY, path, init);
const vercel = (path, init) => api(VERCEL, VERCEL_TOKEN, path, init);

// 1. Neon
let { projects } = await neon(`/projects?search=${NAME}`);
let project = projects.find((p) => p.name === NAME);
if (!project) {
  ({ project } = await neon('/projects', {
    method: 'POST',
    body: JSON.stringify({ project: { name: NAME, region_id: 'aws-us-west-2', pg_version: 16 } }),
  }));
  console.log(`Neon: created project ${project.id}`);
} else {
  console.log(`Neon: reusing project ${project.id}`);
}
const { databases } = await neon(
  `/projects/${project.id}/branches/${project.default_branch_id ?? (await neon(`/projects/${project.id}/branches`)).branches.find((b) => b.default).id}/databases`,
);
const db = databases[0];
const uri = async (pooled) =>
  (
    await neon(
      `/projects/${project.id}/connection_uri?database_name=${db.name}&role_name=${db.owner_name}&pooled=${pooled}`,
    )
  ).uri;
const pooledUrl = await uri(true);
const directUrl = await uri(false);
console.log(`Neon: database ${db.name} ready`);

// 2. Vercel project
let vp;
try {
  vp = await vercel(`/v9/projects/${NAME}`);
  console.log(`Vercel: reusing project ${vp.id}`);
} catch (e) {
  if (e.status !== 404) throw e;
  vp = await vercel('/v11/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: NAME,
      framework: 'nextjs',
      rootDirectory: 'apps/web',
      gitRepository: { type: 'github', repo: `${REPO.org}/${REPO.repo}` },
    }),
  });
  console.log(`Vercel: created project ${vp.id}`);
}

// 3. Env vars. Existing secrets are kept so sessions survive re-runs.
const { envs } = await vercel(`/v10/projects/${vp.id}/env`);
const has = (key) => envs.some((e) => e.key === key);
const secret = () => randomBytes(48).toString('base64url');
const wanted = [
  ['DATABASE_URL', pooledUrl, true],
  ['DIRECT_URL', directUrl, true],
  ['SESSION_SECRET', secret(), false],
  ['JWT_SECRET', secret(), false],
];
for (const [key, value, overwrite] of wanted) {
  if (has(key) && !overwrite) {
    console.log(`Vercel: keeping existing ${key}`);
    continue;
  }
  await vercel(`/v10/projects/${vp.id}/env?upsert=true`, {
    method: 'POST',
    body: JSON.stringify({ key, value, type: 'encrypted', target: ['production', 'preview'] }),
  });
  console.log(`Vercel: set ${key}`);
}

// 4. Deploy dev as a preview.
const dep = await vercel('/v13/deployments', {
  method: 'POST',
  body: JSON.stringify({
    name: NAME,
    project: vp.id,
    target: 'preview',
    gitSource: { type: 'github', org: REPO.org, repo: REPO.repo, ref: 'dev' },
  }),
});
console.log(`Vercel: deploying dev → https://${dep.url}`);
console.log(`Watch: https://vercel.com/${dep.creator?.username ?? ''}/${NAME}`);

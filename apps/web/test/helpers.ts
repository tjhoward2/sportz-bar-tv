import { db } from '@/server/db';

type Handler = (req: Request) => Promise<Response>;

export interface CallOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cookie?: string;
  token?: string;
}

export async function call(handler: Handler, path: string, opts: CallOptions = {}) {
  const headers: Record<string, string> = { host: 'localhost:3000', ...opts.headers };
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  const res = await handler(
    new Request(`http://localhost:3000${path}`, {
      method: opts.method ?? 'POST',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    }),
  );
  const text = await res.text();
  // Tests poke into response bodies freely; strict typing here adds noise.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json = text ? (JSON.parse(text) as Record<string, any>) : {};
  return { res, json };
}

/** "sbtv_session=...; Path=/; ..." → "sbtv_session=..." */
export function cookieFrom(res: Response): string {
  const set = res.headers.get('set-cookie') ?? '';
  return set.split(';')[0] ?? '';
}

export async function resetDb(): Promise<void> {
  await db().$executeRawUnsafe(
    'TRUNCATE "LoginAttempt", "PasswordResetToken", "Feedback", "Referral", "Invitation", "Membership", "Business", "User" CASCADE',
  );
}

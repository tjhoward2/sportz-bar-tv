/**
 * Sign-in rate limit: 5 failed attempts per email per 15 minutes (PRD §3).
 * Stored in Postgres so it holds across all server instances; an in-memory
 * counter would reset per instance and do nothing on Vercel.
 */
import { ApiError } from '../api';
import { db } from '../db';

export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60_000;

export async function assertNotRateLimited(email: string, now = new Date()): Promise<void> {
  const since = new Date(now.getTime() - WINDOW_MS);
  const recent = await db().loginAttempt.findMany({
    where: { key: email, createdAt: { gt: since } },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });
  if (recent.length >= MAX_FAILURES) {
    const oldest = recent[0]!.createdAt.getTime();
    const retryAfter = Math.max(1, Math.ceil((oldest + WINDOW_MS - now.getTime()) / 1000));
    throw new ApiError(429, 'RATE_LIMITED', 'Too many sign-in attempts. Try again later.', {
      'Retry-After': String(retryAfter),
    });
  }
}

export async function recordFailure(email: string, now = new Date()): Promise<void> {
  await db().$transaction([
    db().loginAttempt.create({ data: { key: email, createdAt: now } }),
    // Housekeeping: drop this key's rows older than a day.
    db().loginAttempt.deleteMany({
      where: { key: email, createdAt: { lt: new Date(now.getTime() - 24 * 3_600_000) } },
    }),
  ]);
}

export async function clearFailures(email: string): Promise<void> {
  await db().loginAttempt.deleteMany({ where: { key: email } });
}

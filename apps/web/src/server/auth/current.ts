/**
 * Current user for server components and pages (reads the session cookie
 * via next/headers). API routes use requireAuthIdentity(req) instead.
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { User } from '@/generated/prisma/client';
import { loadActiveUser } from './identity';
import { SESSION_COOKIE, unsealSession } from './session';

export async function getCurrentUser(): Promise<User | undefined> {
  const sealed = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = sealed ? await unsealSession(sealed) : undefined;
  return session ? loadActiveUser(session.uid, session.sv) : undefined;
}

/** For pages behind sign-in: redirects to /login when signed out. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.mustChangePassword) redirect('/first-login');
  return user;
}

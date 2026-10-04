/**
 * Who is calling? Accepts a Bearer token (iOS app) or the session cookie
 * (web). Every API route goes through requireAuthIdentity().
 */
import type { User } from '@/generated/prisma/client';
import { assertSameOrigin, unauthorized } from '../api';
import { db } from '../db';
import { verifyToken } from './jwt';
import { SESSION_COOKIE, readCookie, unsealSession } from './session';

export interface AuthIdentity {
  user: User;
  via: 'cookie' | 'bearer';
}

export async function loadActiveUser(uid: string, sv: number): Promise<User | undefined> {
  const user = await db().user.findUnique({ where: { id: uid } });
  // A bumped sessionVersion (password change, disable) revokes old sessions.
  if (!user || user.status !== 'ACTIVE' || user.sessionVersion !== sv) return undefined;
  return user;
}

export async function getAuthIdentity(req: Request): Promise<AuthIdentity | undefined> {
  const authz = req.headers.get('authorization');
  if (authz?.startsWith('Bearer ')) {
    const claims = await verifyToken(authz.slice('Bearer '.length).trim());
    const user = claims && (await loadActiveUser(claims.uid, claims.sv));
    // An invalid bearer token is a hard fail; don't fall back to cookies.
    return user ? { user, via: 'bearer' } : undefined;
  }
  const sealed = readCookie(req.headers.get('cookie'), SESSION_COOKIE);
  const session = sealed ? await unsealSession(sealed) : undefined;
  const user = session && (await loadActiveUser(session.uid, session.sv));
  return user ? { user, via: 'cookie' } : undefined;
}

export async function requireAuthIdentity(req: Request): Promise<AuthIdentity> {
  const identity = await getAuthIdentity(req);
  if (!identity) throw unauthorized();
  if (identity.via === 'cookie' && req.method !== 'GET' && req.method !== 'HEAD') {
    assertSameOrigin(req);
  }
  return identity;
}

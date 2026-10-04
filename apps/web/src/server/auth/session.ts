/**
 * Web sessions: an encrypted, signed cookie (iron-session's seal format).
 * Holds only the user ID and session version; everything else is read from
 * the DB per request, so a disabled user or changed password takes effect
 * immediately.
 */
import { sealData, unsealData } from 'iron-session';
import { env } from '../env';

export const SESSION_COOKIE = 'sbtv_session';
export const SESSION_TTL_SECONDS = 30 * 24 * 3600;

export interface SessionData {
  uid: string;
  /** User.sessionVersion at sign-in. */
  sv: number;
}

export function sealSession(data: SessionData): Promise<string> {
  return sealData(data, { password: env().SESSION_SECRET, ttl: SESSION_TTL_SECONDS });
}

export async function unsealSession(sealed: string): Promise<SessionData | undefined> {
  try {
    const data = await unsealData<Partial<SessionData>>(sealed, {
      password: env().SESSION_SECRET,
      ttl: SESSION_TTL_SECONDS,
    });
    return typeof data.uid === 'string' && typeof data.sv === 'number'
      ? { uid: data.uid, sv: data.sv }
      : undefined;
  } catch {
    return undefined;
  }
}

function cookieAttributes(maxAge: number): string {
  const secure = env().NODE_ENV === 'production' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function sessionCookie(data: SessionData): Promise<string> {
  return `${SESSION_COOKIE}=${await sealSession(data)}; ${cookieAttributes(SESSION_TTL_SECONDS)}`;
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; ${cookieAttributes(0)}`;
}

export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return undefined;
}

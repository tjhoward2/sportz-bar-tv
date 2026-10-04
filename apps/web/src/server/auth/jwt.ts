/**
 * Bearer tokens for the iOS app (stored in the iOS Keychain via
 * expo-secure-store). HS256, 30-day expiry, revoked by bumping the user's
 * sessionVersion.
 */
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../env';

const ISSUER = 'sportz-bar-tv';
const AUDIENCE = 'sportz-bar-tv-mobile';
export const TOKEN_TTL_SECONDS = 30 * 24 * 3600;

const key = () => new TextEncoder().encode(env().JWT_SECRET);

export async function signToken(
  userId: string,
  sessionVersion: number,
): Promise<{ token: string; expiresAt: string }> {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const token = await new SignJWT({ sv: sessionVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(key());
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

export async function verifyToken(token: string): Promise<{ uid: string; sv: number } | undefined> {
  try {
    const { payload } = await jwtVerify(token, key(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });
    return typeof payload.sub === 'string' && typeof payload.sv === 'number'
      ? { uid: payload.sub, sv: payload.sv }
      : undefined;
  } catch {
    return undefined;
  }
}

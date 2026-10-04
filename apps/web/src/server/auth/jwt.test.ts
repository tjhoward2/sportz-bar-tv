import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { signToken, verifyToken } from './jwt';

describe('mobile JWT', () => {
  it('round-trips user ID and session version', async () => {
    const { token, expiresAt } = await signToken('u1', 2);
    expect(await verifyToken(token)).toEqual({ uid: 'u1', sv: 2 });
    const days = (Date.parse(expiresAt) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
  });

  it('rejects tokens signed with another key or for another audience', async () => {
    const other = await new SignJWT({ sv: 0 })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u1')
      .setIssuer('sportz-bar-tv')
      .setAudience('sportz-bar-tv-mobile')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('a-completely-different-secret-value-xyz'));
    expect(await verifyToken(other)).toBeUndefined();

    const wrongAud = await new SignJWT({ sv: 0 })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u1')
      .setIssuer('sportz-bar-tv')
      .setAudience('someone-else')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    expect(await verifyToken(wrongAud)).toBeUndefined();
  });

  it('rejects expired tokens', async () => {
    const expired = await new SignJWT({ sv: 0 })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u1')
      .setIssuer('sportz-bar-tv')
      .setAudience('sportz-bar-tv-mobile')
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    expect(await verifyToken(expired)).toBeUndefined();
  });
});

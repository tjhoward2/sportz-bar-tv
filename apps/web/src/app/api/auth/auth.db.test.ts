import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/server/db';
import { call, cookieFrom, resetDb } from '../../../../test/helpers';
import { POST as changePassword } from './change-password/route';
import { POST as login } from './login/route';
import { POST as logout } from './logout/route';
import { GET as me } from './me/route';
import { POST as signup } from './signup/route';
import { POST as token } from './token/route';

const PASSWORD = 'correct horse battery';
const person = { firstName: 'Sam', lastName: 'Bartender' };

async function signUp(email = 'sam@example.com', extra: Record<string, unknown> = {}) {
  return call(signup, '/api/auth/signup', {
    body: { email, password: PASSWORD, ...person, ...extra },
  });
}

beforeEach(resetDb);

describe('signup', () => {
  it('creates a user, normalizes the email, and signs them in', async () => {
    const { res, json } = await signUp('  Sam@Example.COM ');
    expect(res.status).toBe(201);
    expect(json.user).toMatchObject({ email: 'sam@example.com', firstName: 'Sam' });
    expect(json.user.passwordHash).toBeUndefined();
    expect(res.headers.get('set-cookie')).toMatch(/^sbtv_session=.+HttpOnly; SameSite=Lax/);
  });

  it('creates a business with the user as admin for bar signups', async () => {
    const { json } = await signUp('owner@cascade.bar', { businessName: 'Cascade Sports Bar' });
    const membership = await db().membership.findFirst({
      where: { userId: json.user.id },
      include: { business: true },
    });
    expect(membership).toMatchObject({ role: 'BUSINESS_ADMIN' });
    expect(membership?.business).toMatchObject({
      name: 'Cascade Sports Bar',
      ownerUserId: json.user.id,
    });
  });

  it('rejects duplicate emails and short passwords', async () => {
    await signUp();
    const dup = await signUp('SAM@example.com');
    expect(dup.res.status).toBe(409);
    expect(dup.json.error.code).toBe('EMAIL_TAKEN');

    const weak = await call(signup, '/api/auth/signup', {
      body: { email: 'x@example.com', password: 'short', ...person },
    });
    expect(weak.res.status).toBe(400);
    expect(weak.json.error.message).toContain('at least 12');
  });

  it('stores a bcrypt hash, never the password', async () => {
    await signUp();
    const user = await db().user.findUniqueOrThrow({ where: { email: 'sam@example.com' } });
    expect(user.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(user.passwordHash).not.toContain(PASSWORD);
  });
});

describe('login', () => {
  beforeEach(async () => {
    await signUp();
  });

  it('sets a session cookie that /me accepts', async () => {
    const { res, json } = await call(login, '/api/auth/login', {
      body: { email: 'sam@example.com', password: PASSWORD },
    });
    expect(res.status).toBe(200);
    expect(json.user.email).toBe('sam@example.com');
    const meRes = await call(me, '/api/auth/me', { method: 'GET', cookie: cookieFrom(res) });
    expect(meRes.res.status).toBe(200);
    expect(meRes.json.user.email).toBe('sam@example.com');
    const user = await db().user.findUniqueOrThrow({ where: { email: 'sam@example.com' } });
    expect(user.loginCount).toBe(2);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrong = await call(login, '/api/auth/login', {
      body: { email: 'sam@example.com', password: 'nope nope nope' },
    });
    const unknown = await call(login, '/api/auth/login', {
      body: { email: 'nobody@example.com', password: 'nope nope nope' },
    });
    expect(wrong.res.status).toBe(401);
    expect(unknown.res.status).toBe(401);
    expect(wrong.json).toEqual(unknown.json);
  });

  it('locks out after 5 failures in 15 minutes, across instances (DB-backed)', async () => {
    for (let i = 0; i < 5; i++) {
      await call(login, '/api/auth/login', { body: { email: 'sam@example.com', password: 'bad' } });
    }
    const blocked = await call(login, '/api/auth/login', {
      body: { email: 'sam@example.com', password: PASSWORD },
    });
    expect(blocked.res.status).toBe(429);
    expect(Number(blocked.res.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('clears failures after a successful sign-in', async () => {
    for (let i = 0; i < 4; i++) {
      await call(login, '/api/auth/login', { body: { email: 'sam@example.com', password: 'bad' } });
    }
    await call(login, '/api/auth/login', {
      body: { email: 'sam@example.com', password: PASSWORD },
    });
    expect(await db().loginAttempt.count()).toBe(0);
  });

  it('refuses disabled accounts', async () => {
    await db().user.update({ where: { email: 'sam@example.com' }, data: { status: 'DISABLED' } });
    const { res } = await call(login, '/api/auth/login', {
      body: { email: 'sam@example.com', password: PASSWORD },
    });
    expect(res.status).toBe(401);
  });

  it('blocks cross-site sign-in attempts', async () => {
    const { res } = await call(login, '/api/auth/login', {
      body: { email: 'sam@example.com', password: PASSWORD },
      headers: { origin: 'https://evil.example' },
    });
    expect(res.status).toBe(403);
  });
});

describe('token (iOS)', () => {
  it('returns a bearer token that /me accepts', async () => {
    await signUp();
    const { res, json } = await call(token, '/api/auth/token', {
      body: { email: 'sam@example.com', password: PASSWORD },
    });
    expect(res.status).toBe(200);
    expect(json.token).toMatch(/^ey/);
    expect(Date.parse(json.expiresAt)).toBeGreaterThan(Date.now());
    const meRes = await call(me, '/api/auth/me', { method: 'GET', token: json.token });
    expect(meRes.json.user.email).toBe('sam@example.com');
  });

  it('rejects a garbage bearer token even with a valid cookie', async () => {
    const { res } = await signUp();
    const meRes = await call(me, '/api/auth/me', {
      method: 'GET',
      token: 'not-a-jwt',
      cookie: cookieFrom(res),
    });
    expect(meRes.res.status).toBe(401);
  });
});

describe('change password', () => {
  it('revokes every existing cookie and token and issues a new one', async () => {
    const { res: signupRes } = await signUp();
    const oldCookie = cookieFrom(signupRes);
    const { json: tok } = await call(token, '/api/auth/token', {
      body: { email: 'sam@example.com', password: PASSWORD },
    });

    const changed = await call(changePassword, '/api/auth/change-password', {
      cookie: oldCookie,
      body: { currentPassword: PASSWORD, newPassword: 'an even longer passphrase' },
    });
    expect(changed.res.status).toBe(200);
    const newCookie = cookieFrom(changed.res);

    expect((await call(me, '/api/auth/me', { method: 'GET', cookie: oldCookie })).res.status).toBe(
      401,
    );
    expect((await call(me, '/api/auth/me', { method: 'GET', token: tok.token })).res.status).toBe(
      401,
    );
    expect((await call(me, '/api/auth/me', { method: 'GET', cookie: newCookie })).res.status).toBe(
      200,
    );
  });

  it('returns a fresh token when called from the app', async () => {
    await signUp();
    const { json: tok } = await call(token, '/api/auth/token', {
      body: { email: 'sam@example.com', password: PASSWORD },
    });
    const changed = await call(changePassword, '/api/auth/change-password', {
      token: tok.token,
      body: { currentPassword: PASSWORD, newPassword: 'an even longer passphrase' },
    });
    expect(changed.json.token).toBeTruthy();
    expect(
      (await call(me, '/api/auth/me', { method: 'GET', token: changed.json.token })).res.status,
    ).toBe(200);
  });

  it('requires the current password', async () => {
    const { res } = await signUp();
    const bad = await call(changePassword, '/api/auth/change-password', {
      cookie: cookieFrom(res),
      body: { currentPassword: 'wrong', newPassword: 'an even longer passphrase' },
    });
    expect(bad.res.status).toBe(400);
    expect(bad.json.error.code).toBe('WRONG_PASSWORD');
  });

  it('requires sign-in', async () => {
    const { res } = await call(changePassword, '/api/auth/change-password', {
      body: { currentPassword: PASSWORD, newPassword: 'an even longer passphrase' },
    });
    expect(res.status).toBe(401);
  });
});

describe('logout', () => {
  it('expires the cookie', async () => {
    const { res } = await call(logout, '/api/auth/logout');
    expect(res.headers.get('set-cookie')).toMatch(/^sbtv_session=; .*Max-Age=0/);
  });
});

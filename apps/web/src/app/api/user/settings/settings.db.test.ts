import { beforeEach, describe, expect, it } from 'vitest';
import { call, cookieFrom, resetDb } from '../../../../../test/helpers';
import { POST as signup } from '../../auth/signup/route';
import { POST as token } from '../../auth/token/route';
import { GET, PUT } from './route';

const valid = {
  providers: [
    { provider: 'XFINITY', isPrimary: true },
    { provider: 'DIRECTV', isPrimary: true },
  ],
  subscriptions: ['ESPN_PLUS', 'PEACOCK', 'ESPN_PLUS'],
  zip: '97201',
  timezone: 'America/Los_Angeles',
  favoriteTeams: ['Trail Blazers', 'Seahawks', 'Trail Blazers'],
};

let cookie = '';

beforeEach(async () => {
  await resetDb();
  const { res } = await call(signup, '/api/auth/signup', {
    body: {
      email: 'sam@example.com',
      password: 'correct horse battery',
      firstName: 'S',
      lastName: 'B',
    },
  });
  cookie = cookieFrom(res);
});

describe('/api/user/settings', () => {
  it('returns empty defaults for a new user', async () => {
    const { res, json } = await call(GET, '/api/user/settings', { method: 'GET', cookie });
    expect(res.status).toBe(200);
    expect(json.settings).toEqual({
      providers: [],
      subscriptions: [],
      zip: null,
      timezone: 'America/Los_Angeles',
      favoriteTeams: [],
    });
  });

  it('saves, normalizes and returns settings', async () => {
    const put = await call(PUT, '/api/user/settings', { method: 'PUT', cookie, body: valid });
    expect(put.res.status).toBe(200);
    expect(put.json.settings).toEqual({
      providers: [
        { provider: 'XFINITY', isPrimary: true },
        { provider: 'DIRECTV', isPrimary: false },
      ],
      subscriptions: ['ESPN_PLUS', 'PEACOCK'],
      zip: '97201',
      timezone: 'America/Los_Angeles',
      favoriteTeams: ['Trail Blazers', 'Seahawks'],
    });
    const get = await call(GET, '/api/user/settings', { method: 'GET', cookie });
    expect(get.json.settings).toEqual(put.json.settings);
  });

  it.each([
    ['unknown provider', { providers: [{ provider: 'COMCAST', isPrimary: true }] }],
    ['unknown service', { subscriptions: ['NETFLIX'] }],
    ['bad zip', { zip: '9720' }],
    ['bad time zone', { timezone: 'Mars/Olympus' }],
    ['tiny team name', { favoriteTeams: ['x'] }],
  ])('rejects %s', async (_label, patch) => {
    const { res, json } = await call(PUT, '/api/user/settings', {
      method: 'PUT',
      cookie,
      body: { ...valid, ...patch },
    });
    expect(res.status).toBe(400);
    expect(json.error.code).toBe('INVALID_INPUT');
  });

  it('requires sign-in', async () => {
    expect((await call(GET, '/api/user/settings', { method: 'GET' })).res.status).toBe(401);
  });

  it('blocks cross-site writes made with the cookie', async () => {
    const { res } = await call(PUT, '/api/user/settings', {
      method: 'PUT',
      cookie,
      body: valid,
      headers: { origin: 'https://evil.example' },
    });
    expect(res.status).toBe(403);
  });

  it('accepts writes from the iOS app with a bearer token', async () => {
    const { json: tok } = await call(token, '/api/auth/token', {
      body: { email: 'sam@example.com', password: 'correct horse battery' },
    });
    const { res } = await call(PUT, '/api/user/settings', {
      method: 'PUT',
      token: tok.token,
      body: valid,
    });
    expect(res.status).toBe(200);
  });
});

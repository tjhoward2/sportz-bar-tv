import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiError, assertSameOrigin, parseBody, route } from './api';

const req = (headers: Record<string, string>, body?: string) =>
  new Request('http://localhost:3000/x', { method: 'POST', headers, body });

describe('assertSameOrigin', () => {
  it('allows same-origin and missing Origin', () => {
    expect(() => assertSameOrigin(req({ host: 'a.test', origin: 'https://a.test' }))).not.toThrow();
    expect(() => assertSameOrigin(req({ host: 'a.test' }))).not.toThrow();
  });

  it('honors x-forwarded-host behind a proxy', () => {
    expect(() =>
      assertSameOrigin(
        req({ host: 'internal', 'x-forwarded-host': 'a.test', origin: 'https://a.test' }),
      ),
    ).not.toThrow();
  });

  it('blocks other origins and junk', () => {
    expect(() => assertSameOrigin(req({ host: 'a.test', origin: 'https://b.test' }))).toThrow(
      ApiError,
    );
    expect(() => assertSameOrigin(req({ host: 'a.test', origin: 'null' }))).toThrow(ApiError);
  });
});

describe('parseBody', () => {
  const Schema = z.object({ n: z.number() });
  it('parses valid JSON', async () => {
    expect(await parseBody(req({}, '{"n":1}'), Schema)).toEqual({ n: 1 });
  });
  it('reports bad JSON and bad shape as 400s', async () => {
    await expect(parseBody(req({}, '{'), Schema)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_JSON',
    });
    await expect(parseBody(req({}, '{"n":"x"}'), Schema)).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_INPUT',
    });
  });
});

describe('route wrapper', () => {
  it('maps ApiError to its status and hides unexpected errors', async () => {
    const teapot = route('t', async () => {
      throw new ApiError(418, 'TEAPOT', 'short and stout');
    });
    const boom = route('b', async () => {
      throw new Error('db password is hunter2');
    });
    const r1 = await teapot(req({}), undefined);
    expect(r1.status).toBe(418);
    expect(await r1.json()).toEqual({ error: { code: 'TEAPOT', message: 'short and stout' } });
    const r2 = await boom(req({}), undefined);
    expect(r2.status).toBe(500);
    expect(JSON.stringify(await r2.json())).not.toContain('hunter2');
  });
});

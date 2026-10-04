import { describe, expect, it } from 'vitest';
import { readCookie, sealSession, sessionCookie, unsealSession } from './session';

describe('session cookie', () => {
  it('round-trips and rejects tampering', async () => {
    const sealed = await sealSession({ uid: 'u1', sv: 3 });
    expect(await unsealSession(sealed)).toEqual({ uid: 'u1', sv: 3 });
    expect(await unsealSession(sealed.slice(0, -4) + 'AAAA')).toBeUndefined();
    expect(await unsealSession('garbage')).toBeUndefined();
  });

  it('sets HttpOnly, SameSite=Lax and a 30-day lifetime', async () => {
    const header = await sessionCookie({ uid: 'u1', sv: 0 });
    expect(header).toMatch(/^sbtv_session=[^;]+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000/);
  });

  it('reads one cookie out of a header', () => {
    expect(readCookie('a=1; sbtv_session=abc=def; b=2', 'sbtv_session')).toBe('abc=def');
    expect(readCookie('a=1', 'sbtv_session')).toBeUndefined();
    expect(readCookie(null, 'sbtv_session')).toBeUndefined();
  });
});

import { assertSameOrigin, json, route } from '@/server/api';
import { clearedSessionCookie } from '@/server/auth/session';

/**
 * Clears the web session cookie. POST, not GET as in the PRD: a GET logout
 * can be triggered by any page embedding the URL (logout CSRF).
 */
export const POST = route('auth.logout', async (req) => {
  assertSameOrigin(req);
  return json({ ok: true }, { headers: { 'Set-Cookie': clearedSessionCookie() } });
});

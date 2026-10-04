import { z } from 'zod';
import { assertSameOrigin, json, parseBody, route } from '@/server/api';
import { sessionCookie } from '@/server/auth/session';
import { EmailSchema, authenticate, toPublicUser } from '@/server/auth/users';

const Body = z.object({ email: EmailSchema, password: z.string().min(1).max(128) });

/** Web sign-in: sets the session cookie. */
export const POST = route('auth.login', async (req) => {
  assertSameOrigin(req);
  const { email, password } = await parseBody(req, Body);
  const user = await authenticate(email, password);
  return json(
    { user: toPublicUser(user) },
    { headers: { 'Set-Cookie': await sessionCookie({ uid: user.id, sv: user.sessionVersion }) } },
  );
});

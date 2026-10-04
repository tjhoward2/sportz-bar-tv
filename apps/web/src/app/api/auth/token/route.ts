import { z } from 'zod';
import { json, parseBody, route } from '@/server/api';
import { signToken } from '@/server/auth/jwt';
import { EmailSchema, authenticate, toPublicUser } from '@/server/auth/users';

const Body = z.object({ email: EmailSchema, password: z.string().min(1).max(128) });

/** iOS sign-in: returns a bearer token instead of a cookie. */
export const POST = route('auth.token', async (req) => {
  const { email, password } = await parseBody(req, Body);
  const user = await authenticate(email, password);
  const { token, expiresAt } = await signToken(user.id, user.sessionVersion);
  return json({ token, expiresAt, user: toPublicUser(user) });
});

import { z } from 'zod';
import { ApiError, json, parseBody, route } from '@/server/api';
import { requireAuthIdentity } from '@/server/auth/identity';
import { signToken } from '@/server/auth/jwt';
import { hashPassword, PasswordSchema, verifyPassword } from '@/server/auth/password';
import { sessionCookie } from '@/server/auth/session';
import { toPublicUser } from '@/server/auth/users';
import { db } from '@/server/db';

const Body = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: PasswordSchema,
});

/**
 * Changes the password and signs out every other session/device by bumping
 * sessionVersion. The caller gets a fresh cookie or token.
 */
export const POST = route('auth.change-password', async (req) => {
  const { user, via } = await requireAuthIdentity(req);
  const { currentPassword, newPassword } = await parseBody(req, Body);
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new ApiError(400, 'WRONG_PASSWORD', 'Current password is incorrect.');
  }
  if (currentPassword === newPassword) {
    throw new ApiError(400, 'SAME_PASSWORD', 'New password must be different.');
  }
  const updated = await db().user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false,
      sessionVersion: { increment: 1 },
    },
  });
  if (via === 'bearer') {
    const { token, expiresAt } = await signToken(updated.id, updated.sessionVersion);
    return json({ user: toPublicUser(updated), token, expiresAt });
  }
  return json(
    { user: toPublicUser(updated) },
    {
      headers: {
        'Set-Cookie': await sessionCookie({ uid: updated.id, sv: updated.sessionVersion }),
      },
    },
  );
});

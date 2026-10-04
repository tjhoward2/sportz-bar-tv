import { z } from 'zod';
import type { User } from '@/generated/prisma/client';
import { ApiError } from '../api';
import { db } from '../db';
import { burnPasswordCheck, verifyPassword } from './password';
import { assertNotRateLimited, clearFailures, recordFailure } from './rateLimit';

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address.').max(254));

/** The only user shape that leaves the server. */
export interface PublicUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
}

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    isSuperAdmin: u.isSuperAdmin,
    mustChangePassword: u.mustChangePassword,
  };
}

const INVALID = () => new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');

/**
 * Verifies credentials with rate limiting and constant-ish timing. Same
 * error for unknown email, wrong password and disabled account, so the
 * response never reveals which accounts exist.
 */
export async function authenticate(email: string, password: string): Promise<User> {
  await assertNotRateLimited(email);
  const user = await db().user.findUnique({ where: { email } });
  if (!user) {
    await burnPasswordCheck(password);
    await recordFailure(email);
    throw INVALID();
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok || user.status !== 'ACTIVE') {
    await recordFailure(email);
    throw INVALID();
  }
  await clearFailures(email);
  return db().user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
  });
}

import { z } from 'zod';
import { ApiError, assertSameOrigin, json, parseBody, route } from '@/server/api';
import { hashPassword, PasswordSchema } from '@/server/auth/password';
import { sessionCookie } from '@/server/auth/session';
import { EmailSchema, toPublicUser } from '@/server/auth/users';
import { db } from '@/server/db';
import { Prisma } from '@/generated/prisma/client';

const Name = z.string().trim().min(1).max(80);

const Body = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  firstName: Name,
  lastName: Name,
  /** Present for "bar" signup: creates the business with this user as admin. */
  businessName: z.string().trim().min(2).max(120).optional(),
});

export const POST = route('auth.signup', async (req) => {
  assertSameOrigin(req);
  const body = await parseBody(req, Body);
  const passwordHash = await hashPassword(body.password);

  try {
    const user = await db().$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: body.email,
          passwordHash,
          firstName: body.firstName,
          lastName: body.lastName,
          lastLoginAt: new Date(),
          loginCount: 1,
        },
      });
      if (body.businessName) {
        await tx.business.create({
          data: {
            name: body.businessName,
            ownerUserId: created.id,
            memberships: { create: { userId: created.id, role: 'BUSINESS_ADMIN' } },
          },
        });
      }
      return created;
    });
    return json(
      { user: toPublicUser(user) },
      {
        status: 201,
        headers: { 'Set-Cookie': await sessionCookie({ uid: user.id, sv: user.sessionVersion }) },
      },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');
    }
    throw err;
  }
});

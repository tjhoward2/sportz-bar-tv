import { json, route } from '@/server/api';
import { requireAuthIdentity } from '@/server/auth/identity';
import { toPublicUser } from '@/server/auth/users';
import { db } from '@/server/db';

/** Current user plus business memberships. */
export const GET = route('auth.me', async (req) => {
  const { user } = await requireAuthIdentity(req);
  const memberships = await db().membership.findMany({
    where: { userId: user.id },
    select: { role: true, business: { select: { id: true, name: true } } },
  });
  return json({
    user: toPublicUser(user),
    memberships: memberships.map((m) => ({ role: m.role, business: m.business })),
  });
});

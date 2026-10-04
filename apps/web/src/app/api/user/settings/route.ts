import { json, parseBody, route } from '@/server/api';
import { requireAuthIdentity } from '@/server/auth/identity';
import { db } from '@/server/db';
import { SettingsSchema, settingsFromUser, settingsToUserData } from '@/server/settings';

export const GET = route('user.settings.get', async (req) => {
  const { user } = await requireAuthIdentity(req);
  return json({ settings: settingsFromUser(user) });
});

/** Full replace of the user's TV setup. */
export const PUT = route('user.settings.put', async (req) => {
  const { user } = await requireAuthIdentity(req);
  const body = await parseBody(req, SettingsSchema);
  const updated = await db().user.update({
    where: { id: user.id },
    data: settingsToUserData(body),
  });
  return json({ settings: settingsFromUser(updated) });
});

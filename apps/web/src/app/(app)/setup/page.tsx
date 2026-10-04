import type { Metadata } from 'next';
import { requireUser } from '@/server/auth/current';
import { settingsFromUser } from '@/server/settings';
import { SetupForm } from './SetupForm';

export const metadata: Metadata = { title: 'Setup · Sportz Bar TV' };
export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const user = await requireUser();
  return <SetupForm initial={settingsFromUser(user)} />;
}

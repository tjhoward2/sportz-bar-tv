import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/current';
import { ChangePasswordForm } from './ChangePasswordForm';

export const metadata: Metadata = { title: 'Set your password · Sportz Bar TV' };
export const dynamic = 'force-dynamic';

export default async function FirstLoginPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.mustChangePassword) redirect('/dashboard');
  return <ChangePasswordForm />;
}

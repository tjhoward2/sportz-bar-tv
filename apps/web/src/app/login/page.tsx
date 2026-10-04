import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/current';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in · Sportz Bar TV' };
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return <LoginForm />;
}

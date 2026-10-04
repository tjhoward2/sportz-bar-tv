import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/auth/current';
import { SignupForm } from './SignupForm';

export const metadata: Metadata = { title: 'Sign up · Sportz Bar TV' };
export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return <SignupForm />;
}

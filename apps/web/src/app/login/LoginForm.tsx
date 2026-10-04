'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { AuthCard, Button, Field, FormError, postJson } from '@/components/form';

export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(undefined);
    try {
      const { user } = await postJson<{ user: { mustChangePassword: boolean } }>(
        '/api/auth/login',
        {
          email: form.get('email'),
          password: form.get('password'),
        },
      );
      router.replace(user.mustChangePassword ? '/first-login' : '/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Sign in">
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <Button type="submit" busy={busy}>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted">
        New here?{' '}
        <Link href="/signup" className="font-semibold text-text underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}

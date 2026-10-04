'use client';

import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import Link from 'next/link';
import { useState } from 'react';
import { AuthCard, Button, Field, FormError, postJson } from '@/components/form';

export function SignupForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'personal' | 'bar'>('bar');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(undefined);
    try {
      await postJson('/api/auth/signup', {
        email: form.get('email'),
        password: form.get('password'),
        firstName: form.get('firstName'),
        lastName: form.get('lastName'),
        businessName: mode === 'bar' ? form.get('businessName') : undefined,
      });
      router.replace('/setup');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed.');
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Create an account">
      <div role="tablist" className="mb-6 grid grid-cols-2 gap-2">
        {(['bar', 'personal'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={clsx(
              'tap rounded-xl border text-sm font-semibold',
              mode === m ? 'border-text bg-text text-bg' : 'border-line bg-surface',
            )}
          >
            {m === 'bar' ? 'For my bar' : 'Just me'}
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        {mode === 'bar' && <Field label="Bar name" name="businessName" required minLength={2} />}
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" name="firstName" autoComplete="given-name" required />
          <Field label="Last name" name="lastName" autoComplete="family-name" required />
        </div>
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          hint="At least 12 characters. A short phrase works well."
        />
        <Button type="submit" busy={busy}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-text underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}

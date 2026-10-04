'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthCard, Button, Field, FormError, postJson } from '@/components/form';

export function ChangePasswordForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get('newPassword') !== form.get('confirm')) {
      setError("The new passwords don't match.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await postJson('/api/auth/change-password', {
        currentPassword: form.get('currentPassword'),
        newPassword: form.get('newPassword'),
      });
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password.');
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Set your password">
      <p className="mb-6 text-muted">Replace the temporary password you were given.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormError message={error} />
        <Field
          label="Temporary password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
        <Field
          label="New password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          hint="At least 12 characters."
        />
        <Field
          label="Confirm new password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
        />
        <Button type="submit" busy={busy}>
          Save password
        </Button>
      </form>
    </AuthCard>
  );
}

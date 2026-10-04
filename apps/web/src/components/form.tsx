'use client';

import clsx from 'clsx';

export function Field({
  label,
  hint,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <input
        {...input}
        className="tap w-full rounded-xl border border-line bg-surface px-4 text-base outline-none focus:border-overridden"
      />
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Button({
  busy,
  variant = 'primary',
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className={clsx(
        'tap inline-flex w-full items-center justify-center rounded-xl px-5 text-base font-bold disabled:opacity-60',
        variant === 'primary' ? 'bg-text text-bg' : 'border border-line bg-surface',
        props.className,
      )}
    >
      {busy ? 'Working…' : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-live/50 bg-live/10 px-4 py-3 text-sm">
      {message}
    </p>
  );
}

export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <p className="mb-1 text-sm font-semibold text-muted">Sportz Bar TV</p>
      <h1 className="mb-6 text-3xl font-bold">{title}</h1>
      {children}
    </main>
  );
}

/** POST JSON; returns the parsed body or throws with the API's message. */
export async function postJson<T>(url: string, body: unknown, method = 'POST'): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? `Request failed (${res.status}).`);
  return data as T;
}

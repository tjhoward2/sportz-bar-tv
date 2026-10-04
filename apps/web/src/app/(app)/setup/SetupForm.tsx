'use client';

import {
  PROVIDERS,
  PROVIDER_KEYS,
  STREAMING_KEYS,
  STREAMING_SERVICES,
  type ProviderConfig,
  type ProviderKey,
  type StreamingKey,
} from '@sbtv/core';
import clsx from 'clsx';
import { useState } from 'react';
import { Button, Field, FormError, postJson } from '@/components/form';
import type { UserSettings } from '@/server/settings';

const TIME_ZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Phoenix',
  'America/Chicago',
  'America/New_York',
  'America/Anchorage',
  'Pacific/Honolulu',
];

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={clsx(
        'tap rounded-xl border px-4 text-left text-sm font-semibold',
        on ? 'border-confirmed bg-confirmed/15' : 'border-line bg-surface text-muted',
      )}
    >
      {on && (
        <span aria-hidden className="mr-1 text-confirmed">
          ✓
        </span>
      )}
      {children}
    </button>
  );
}

export function SetupForm({ initial }: { initial: UserSettings }) {
  const [providers, setProviders] = useState<ProviderConfig[]>(initial.providers);
  const [subs, setSubs] = useState<StreamingKey[]>(initial.subscriptions);
  const [zip, setZip] = useState(initial.zip ?? '');
  const [timezone, setTimezone] = useState(initial.timezone);
  const [teams, setTeams] = useState(initial.favoriteTeams.join(', '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  const has = (k: ProviderKey) => providers.some((p) => p.provider === k);

  function toggleProvider(k: ProviderKey) {
    setSaved(false);
    setProviders((list) =>
      has(k)
        ? list.filter((p) => p.provider !== k)
        : [...list, { provider: k, isPrimary: list.length === 0 }],
    );
  }

  function makePrimary(k: ProviderKey) {
    setSaved(false);
    setProviders((list) => list.map((p) => ({ ...p, isPrimary: p.provider === k })));
  }

  function toggleSub(k: StreamingKey) {
    setSaved(false);
    setSubs((list) => (list.includes(k) ? list.filter((s) => s !== k) : [...list, k]));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await postJson(
        '/api/user/settings',
        {
          providers,
          subscriptions: subs,
          zip: zip.trim() === '' ? null : zip.trim(),
          timezone,
          favoriteTeams: teams
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        },
        'PUT',
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Your TV setup</h1>

      <section className="space-y-3">
        <h2 className="font-bold">TV providers</h2>
        <p className="text-sm text-muted">
          What your TVs are hooked up to. Pick one as primary; it&apos;s listed first.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PROVIDER_KEYS.filter((k) => k !== 'NONE').map((k) => (
            <Toggle key={k} on={has(k)} onClick={() => toggleProvider(k)}>
              {PROVIDERS[k].label}
            </Toggle>
          ))}
        </div>
        {providers.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-sm text-muted">Primary:</span>
            {providers.map((p) => (
              <button
                key={p.provider}
                type="button"
                aria-pressed={p.isPrimary}
                onClick={() => makePrimary(p.provider)}
                className={clsx(
                  'tap rounded-xl border px-3 text-sm font-semibold',
                  p.isPrimary ? 'border-text bg-text text-bg' : 'border-line bg-surface',
                )}
              >
                {PROVIDERS[p.provider].shortLabel}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">Streaming services</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {STREAMING_KEYS.map((k) => (
            <Toggle key={k} on={subs.includes(k)} onClick={() => toggleSub(k)}>
              {STREAMING_SERVICES[k].label}
            </Toggle>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Field
          label="ZIP code"
          inputMode="numeric"
          pattern="\d{5}"
          maxLength={5}
          value={zip}
          onChange={(e) => {
            setZip(e.target.value);
            setSaved(false);
          }}
          hint="Picks the right local channels."
        />
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">Time zone</span>
          <select
            value={timezone}
            onChange={(e) => {
              setTimezone(e.target.value);
              setSaved(false);
            }}
            className="tap w-full rounded-xl border border-line bg-surface px-4"
          >
            {[...new Set([timezone, ...TIME_ZONES])].map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace('America/', '').replace('Pacific/', '').replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>
      </section>

      <Field
        label="Favorite teams"
        value={teams}
        onChange={(e) => {
          setTeams(e.target.value);
          setSaved(false);
        }}
        placeholder="Trail Blazers, Timbers, Seahawks"
        hint="Comma-separated. Favorites sort to the top."
      />

      <FormError message={error} />
      <div className="sticky bottom-16 md:bottom-4">
        <Button type="submit" busy={busy}>
          {saved ? 'Saved ✓' : 'Save setup'}
        </Button>
      </div>
    </form>
  );
}

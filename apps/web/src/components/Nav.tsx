'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Games', icon: '📺' },
  { href: '/scores', label: 'Scores', icon: '🏆' },
  { href: '/setup', label: 'Setup', icon: '⚙️' },
] as const;

function useActive() {
  const path = usePathname();
  return (href: string) => path === href || path.startsWith(`${href}/`);
}

export function TopNav() {
  const isActive = useActive();
  return (
    <nav aria-label="Main" className="hidden gap-1 md:flex">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(item.href) ? 'page' : undefined}
          className={clsx(
            'tap flex items-center rounded-xl px-4 text-sm font-semibold',
            isActive(item.href) ? 'bg-surface2 text-text' : 'text-muted hover:text-text',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const isActive = useActive();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(item.href) ? 'page' : undefined}
          className={clsx(
            'flex h-14 flex-1 flex-col items-center justify-center text-xs font-semibold',
            isActive(item.href) ? 'text-text' : 'text-muted',
          )}
        >
          <span aria-hidden className="text-lg leading-none">
            {item.icon}
          </span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={signOut}
      className="tap rounded-xl px-3 text-sm font-semibold text-muted hover:text-text"
    >
      Sign out
    </button>
  );
}

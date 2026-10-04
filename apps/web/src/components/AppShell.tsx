import { BottomNav, SignOutButton, TopNav } from './Nav';

export function AppShell({ subtitle, children }: { subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-app items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-lg font-bold leading-tight">Sportz Bar TV</p>
            {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            <TopNav />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-app px-4 py-4 sm:px-6 lg:px-8">{children}</main>
      <BottomNav />
    </div>
  );
}

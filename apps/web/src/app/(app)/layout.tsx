import { AppShell } from '@/components/AppShell';
import { requireUser } from '@/server/auth/current';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
  return <AppShell subtitle={name}>{children}</AppShell>;
}

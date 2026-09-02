import { requireUser } from '@/server/auth';
import { getStats } from '@/server/stats';
import { listTasks, listUserTags } from '@/server/tasks';
import { AppShell } from './AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [initialTasks, initialStats, initialTags] = await Promise.all([
    listTasks(user.id, { view: 'all', sort: 'created', direction: 'desc', limit: 200, offset: 0 }, user.timezone),
    getStats(user, user.timezone),
    listUserTags(user.id),
  ]);
  return <AppShell initialTasks={initialTasks} initialStats={initialStats} initialTags={initialTags} initialUser={{ id: user.id, email: user.email, displayName: user.displayName, timezone: user.timezone, theme: user.theme, soundEnabled: user.soundEnabled }}>{children}</AppShell>;
}

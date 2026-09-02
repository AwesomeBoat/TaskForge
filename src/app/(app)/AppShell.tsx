'use client';

import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, CheckCircle2, Focus, Inbox, LogOut, Settings, Sparkles, Sun } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiPost } from '@/lib/api-client';
import { TaskStoreProvider } from '@/features/tasks/task-store';
import type { CurrentUser, Stats, Task } from '@/types';

const links = [
  { href: '/', label: 'Today', icon: Sun },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/upcoming', label: 'Upcoming', icon: Sparkles },
  { href: '/important', label: 'Important', icon: Sparkles },
  { href: '/completed', label: 'Completed', icon: CheckCircle2 },
  { href: '/focus', label: 'Focus', icon: Focus },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
];

export function AppShell({ children, initialTasks, initialStats, initialTags, initialUser }: { children: React.ReactNode; initialTasks: Task[]; initialStats: Stats; initialTags: string[]; initialUser: CurrentUser }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await apiPost('/api/auth/logout', {});
    router.replace('/login');
    router.refresh();
  }

  return (
    <TaskStoreProvider initialTasks={initialTasks} initialStats={initialStats} initialTags={initialTags} initialUser={initialUser}>
      <div className="min-h-dvh bg-bg">
        <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-border bg-surface px-4 py-6 lg:block">
          <div className="mb-10 px-3"><p className="text-sm font-semibold tracking-[0.18em] text-accent">TASKFORGE</p><p className="mt-1 text-xs text-faint">Make progress visible.</p></div>
          <nav className="space-y-1" aria-label="Main navigation">
            {links.map(({ href, label, icon: Icon }) => <a key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${pathname === href ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-bg-subtle hover:text-text'}`}><Icon className="size-4" />{label}</a>)}
          </nav>
          <div className="absolute inset-x-4 bottom-6 space-y-1 border-t border-border pt-4">
            <a href="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-bg-subtle hover:text-text"><Settings className="size-4" />Settings</a>
            <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-muted hover:bg-bg-subtle hover:text-text"><LogOut className="size-4" />Sign out</button>
          </div>
        </aside>
        <div className="lg:pl-60">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-bg/90 px-4 backdrop-blur sm:px-6 lg:hidden">
            <p className="text-sm font-semibold tracking-[0.16em] text-accent">TASKFORGE</p>
            <Button size="icon" variant="ghost" aria-label="Settings" onClick={() => router.push('/settings')}><Settings className="size-4" /></Button>
          </header>
          <main>{children}</main>
          <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-surface/95 px-2 py-2 backdrop-blur lg:hidden" aria-label="Mobile navigation">
            {links.slice(0, 5).map(({ href, label, icon: Icon }) => <a key={href} href={href} className={`flex flex-col items-center gap-1 rounded-md py-1 text-[10px] ${pathname === href ? 'text-accent' : 'text-muted'}`}><Icon className="size-4" />{label}</a>)}
          </nav>
        </div>
      </div>
    </TaskStoreProvider>
  );
}

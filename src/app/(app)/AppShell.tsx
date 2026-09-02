'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  House,
  Inbox,
  LogOut,
  Settings,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiPost } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { TaskStoreProvider } from '@/features/tasks/task-store';
import { ThemeToggle } from '@/features/shell/ThemeToggle';
import { RewardFlash } from '@/features/xp/RewardFlash';
import { XpWidget } from '@/features/xp/XpWidget';
import type { CurrentUser, Stats, Task } from '@/types';

type NavLink = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const LINKS: NavLink[] = [
  { href: '/', label: 'Home', icon: House },
  { href: '/today', label: 'Today', icon: CalendarDays },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/upcoming', label: 'Upcoming', icon: CalendarDays },
  { href: '/important', label: 'Important', icon: AlertTriangle },
  { href: '/completed', label: 'Completed', icon: CheckCircle2 },
  { href: '/focus', label: 'Focus', icon: Timer },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
];

const MOBILE_LINKS: NavLink[] = [
  LINKS[0]!,
  LINKS[1]!,
  LINKS[2]!,
  LINKS[6]!,
  LINKS[7]!,
];

function NavItem({ link, active, onNavigate }: { link: NavLink; active: boolean; onNavigate?: () => void }) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
        active ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-bg-subtle hover:text-text',
      )}
    >
      <Icon className="size-4" />
      {link.label}
    </Link>
  );
}

export function AppShell({
  children,
  initialTasks,
  initialStats,
  initialTags,
  initialUser,
}: {
  children: React.ReactNode;
  initialTasks: Task[];
  initialStats: Stats;
  initialTags: string[];
  initialUser: CurrentUser;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  async function logout() {
    setSigningOut(true);
    try {
      await apiPost('/api/auth/logout', {});
    } catch {
      // Signing out locally matters more than the response.
    }
    // A full load clears every trace of the previous session from memory.
    window.location.assign('/login');
  }

  return (
    <TaskStoreProvider
      initialTasks={initialTasks}
      initialStats={initialStats}
      initialTags={initialTags}
      initialUser={initialUser}
    >
      <div className="min-h-dvh bg-bg">
        <a
          href="#main-content"
          className="sr-only-focusable absolute left-4 top-4 z-[80] rounded-lg bg-accent px-3 py-2 text-sm text-accent-contrast"
        >
          Skip to content
        </a>

        <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
          <div className="mb-6 px-3">
            <p className="text-sm font-semibold tracking-[0.18em] text-accent">TASKFORGE</p>
            <p className="mt-1 text-xs text-faint">Make progress visible.</p>
          </div>

          <div className="mb-5">
            <XpWidget />
          </div>

          <nav className="space-y-1 overflow-y-auto" aria-label="Main navigation">
            {LINKS.map((link) => (
              <NavItem key={link.href} link={link} active={isActive(link.href)} />
            ))}
          </nav>

          <div className="mt-auto space-y-1 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="truncate text-xs text-faint" title={initialUser.email}>
                {initialUser.email}
              </span>
              <ThemeToggle />
            </div>
            <NavItem
              link={{ href: '/settings', label: 'Settings', icon: Settings }}
              active={isActive('/settings')}
            />
            <button
              type="button"
              onClick={() => void logout()}
              disabled={signingOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-muted transition-colors hover:bg-bg-subtle hover:text-text disabled:opacity-60"
            >
              <LogOut className="size-4" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </aside>

        <div className="lg:pl-60">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur sm:px-6 lg:hidden">
            <Link href="/" className="text-sm font-semibold tracking-[0.16em] text-accent">
              TASKFORGE
            </Link>
            <div className="flex items-center gap-1">
              <XpWidget variant="compact" />
              <ThemeToggle />
              <Button
                size="icon"
                variant="ghost"
                aria-label="Settings"
                onClick={() => router.push('/settings')}
              >
                <Settings className="size-4" />
              </Button>
            </div>
          </header>

          <main id="main-content">{children}</main>

          <nav
            className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur lg:hidden"
            aria-label="Main navigation"
          >
            {MOBILE_LINKS.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 flex-col items-center justify-center gap-1 rounded-md py-1 text-[10px] transition-colors',
                    active ? 'text-accent' : 'text-muted',
                  )}
                >
                  <Icon className="size-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <RewardFlash />
      </div>
    </TaskStoreProvider>
  );
}

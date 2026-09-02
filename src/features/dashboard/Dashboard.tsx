'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Flame, Inbox, Sun, Timer, Zap } from 'lucide-react';
import { buttonClasses } from '@/components/ui/Button';
import { Card, EmptyState } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/cn';
import { filterTasks, sortTasks } from '@/features/tasks/filters';
import { QuickAdd } from '@/features/tasks/QuickAdd';
import { TaskList } from '@/features/tasks/TaskList';
import { useTaskStore } from '@/features/tasks/task-store';

function StatChip({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone: 'ember' | 'accent' | 'success';
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'grid size-8 place-items-center rounded-lg',
          tone === 'ember' && 'bg-ember-soft text-ember',
          tone === 'accent' && 'bg-accent-soft text-accent',
          tone === 'success' && 'bg-success-soft text-success',
        )}
      >
        {icon}
      </span>
      <div className="leading-tight">
        <p className="text-[15px] font-semibold tabular-nums text-text">{value}</p>
        <p className="text-[11px] text-muted">{label}</p>
      </div>
    </div>
  );
}

export function Dashboard({ greeting, dateLabel }: { greeting: string; dateLabel: string }) {
  const { tasks, stats, user, today } = useTaskStore();

  const todaysTasks = useMemo(
    () => sortTasks(filterTasks(tasks, { view: 'today', today }), 'priority', 'desc'),
    [tasks, today],
  );
  const inboxCount = useMemo(
    () => tasks.filter((task) => task.status === 'todo' && !task.dueDate).length,
    [tasks],
  );

  const done = stats.completedToday;
  const total = stats.completedToday + stats.dueToday;
  const allDone = total > 0 && done === total;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-24 pt-6 sm:px-6 sm:pb-10 sm:pt-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {greeting}, {user.displayName} <span aria-hidden>👋</span>
        </h1>
        <p className="text-[13px] text-muted">{dateLabel}</p>
      </header>

      <Card className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium text-muted">Today&rsquo;s progress</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-text">
              {done} <span className="text-faint">/ {total}</span>{' '}
              <span className="text-sm font-normal text-muted">
                {total === 1 ? 'task' : 'tasks'}
              </span>
            </p>
          </div>
          {allDone && (
            <span className="animate-pop rounded-full bg-success-soft px-2.5 py-1 text-[12px] font-medium text-success">
              All clear
            </span>
          )}
        </div>

        <ProgressBar
          value={done}
          max={Math.max(total, 1)}
          tone={allDone ? 'success' : 'accent'}
          label={`${done} of ${total} tasks completed today`}
        />

        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-border pt-4">
          <StatChip
            icon={<Flame className="size-4" />}
            value={`${stats.streakCurrent}`}
            label="day streak"
            tone="ember"
          />
          <StatChip
            icon={<Zap className="size-4" />}
            value={`Level ${stats.level}`}
            label={`${stats.xpIntoLevel} / ${stats.xpForNextLevel} XP`}
            tone="accent"
          />
          <StatChip icon={<Sun className="size-4" />} value={`+${stats.xpToday}`} label="XP today" tone="success" />

          <Link href="/focus" className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'ml-auto' })}>
            <Timer className="size-3.5" />
            Focus block
          </Link>
        </div>
      </Card>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-text">Today&rsquo;s tasks</h2>
          <Link
            href="/inbox"
            className="inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-accent"
          >
            All tasks
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <QuickAdd defaultDueDate={today} />

        <TaskList
          tasks={todaysTasks}
          empty={
            <EmptyState
              icon={inboxCount > 0 ? <Inbox className="size-5" /> : <Sun className="size-5" />}
              title={inboxCount > 0 ? 'Nothing scheduled for today' : 'Your day is clear'}
              description={
                inboxCount > 0
                  ? `You have ${inboxCount} undated ${inboxCount === 1 ? 'task' : 'tasks'} waiting in your inbox.`
                  : 'Add something above when you know what today looks like.'
              }
              action={
                inboxCount > 0 ? (
                  <Link href="/inbox" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                    Open inbox
                  </Link>
                ) : undefined
              }
            />
          }
        />
      </section>
    </div>
  );
}

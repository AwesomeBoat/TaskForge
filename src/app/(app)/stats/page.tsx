'use client';

import { useMemo } from 'react';
import { BarChart3, Flame, Target, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTaskStore } from '@/features/tasks/task-store';

function StatCard({
  icon,
  value,
  label,
}: {
  icon?: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <Card>
      {icon}
      <p className="mt-3 text-2xl font-semibold tabular-nums text-text">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </Card>
  );
}

export default function StatsPage() {
  const { stats, tasks } = useTaskStore();

  const completedTotal = useMemo(
    () => tasks.filter((task) => task.status === 'completed').length,
    [tasks],
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-24 pt-6 sm:px-6 sm:pb-10 sm:pt-8">
      <header>
        <p className="text-sm font-semibold tracking-[0.14em] text-accent">PROGRESS</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">Your momentum, in view.</h1>
      </header>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Level</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums text-text">{stats.level}</p>
          </div>
          <Trophy className="size-5 text-ember" />
        </div>

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs tabular-nums text-muted">
            <span>{stats.xpIntoLevel} XP</span>
            <span>{stats.xpForNextLevel} XP</span>
          </div>
          <ProgressBar
            value={stats.xpIntoLevel}
            max={stats.xpForNextLevel}
            label={`Progress towards level ${stats.level + 1}`}
            tone="ember"
          />
        </div>

        <p className="mt-3 text-sm tabular-nums text-muted">{stats.xp} total XP earned</p>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Flame className="size-4 text-ember" />} value={stats.streakCurrent} label="Day streak" />
        <StatCard icon={<Target className="size-4 text-success" />} value={stats.completedToday} label="Done today" />
        <StatCard icon={<BarChart3 className="size-4 text-accent" />} value={stats.xpToday} label="XP today" />
        <StatCard value={stats.streakLongest} label="Best streak" />
      </div>

      <Card>
        <p className="text-sm text-muted">
          You have completed <span className="font-semibold text-text">{completedTotal}</span>{' '}
          {completedTotal === 1 ? 'task' : 'tasks'} in the history you can see, and there are{' '}
          <span className="font-semibold text-text">{stats.dueToday}</span> still due today.
        </p>
      </Card>
    </div>
  );
}

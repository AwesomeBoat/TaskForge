'use client';

import { Flame, Zap } from 'lucide-react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/cn';
import { useTaskStore } from '@/features/tasks/task-store';

/**
 * The always-visible progress readout. Keeping level, XP and streak in the
 * chrome is what makes finishing a task feel like it counted.
 */
export function XpWidget({ variant = 'sidebar' }: { variant?: 'sidebar' | 'compact' }) {
  const { stats } = useTaskStore();

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 text-[12px]">
        <span className="inline-flex items-center gap-1 font-medium text-accent">
          <Zap aria-hidden className="size-3.5" />
          <span className="tabular-nums">Lv {stats.level}</span>
        </span>
        {stats.streakCurrent > 0 && (
          <span className="inline-flex items-center gap-1 font-medium text-ember">
            <Flame aria-hidden className="size-3.5" />
            <span className="tabular-nums">{stats.streakCurrent}</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-bg-subtle/60 px-3 py-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-text">
          <Zap aria-hidden className="size-3.5 text-accent" />
          Level {stats.level}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[12px] font-medium tabular-nums',
            stats.streakCurrent > 0 ? 'text-ember' : 'text-faint',
          )}
          title={`Longest streak: ${stats.streakLongest} days`}
        >
          <Flame aria-hidden className="size-3.5" />
          {stats.streakCurrent}
        </span>
      </div>

      <ProgressBar
        className="mt-2.5"
        size="sm"
        value={stats.xpIntoLevel}
        max={stats.xpForNextLevel}
        label={`${stats.xpIntoLevel} of ${stats.xpForNextLevel} XP towards level ${stats.level + 1}`}
      />

      <p className="mt-2 text-[11px] tabular-nums text-faint">
        {stats.xpIntoLevel} / {stats.xpForNextLevel} XP
        {stats.xpToday > 0 && <span className="text-accent"> · +{stats.xpToday} today</span>}
      </p>
    </div>
  );
}

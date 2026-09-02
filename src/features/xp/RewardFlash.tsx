'use client';

import { useEffect, useState } from 'react';
import { Flame, Sparkles, Zap } from 'lucide-react';
import { useTaskStore } from '@/features/tasks/task-store';

type Flash = { id: number; kind: 'xp' | 'level' | 'streak'; text: string };

/**
 * The reward moment: a small "+20 XP" lift on every completion, and a louder
 * (but still short) note when a level or a streak day is earned. Deliberately
 * transient — nothing here can be clicked or has to be dismissed.
 */
export function RewardFlash() {
  const { reward } = useTaskStore();
  const [flashes, setFlashes] = useState<Flash[]>([]);

  useEffect(() => {
    if (!reward) return;

    const next: Flash[] = [];
    if (reward.xp > 0) next.push({ id: reward.id * 10, kind: 'xp', text: `+${reward.xp} XP` });
    if (reward.leveledUp) next.push({ id: reward.id * 10 + 1, kind: 'level', text: `Level ${reward.level}` });
    if (reward.streakIncreased && reward.streak > 1) {
      next.push({ id: reward.id * 10 + 2, kind: 'streak', text: `${reward.streak} day streak` });
    }
    if (next.length === 0) return;

    setFlashes((current) => [...current, ...next]);
    const ids = new Set(next.map((flash) => flash.id));
    const timer = window.setTimeout(() => {
      setFlashes((current) => current.filter((flash) => !ids.has(flash.id)));
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [reward]);

  if (flashes.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[65] flex flex-col items-center gap-2 lg:bottom-10"
    >
      {flashes.map((flash) => (
        <div
          key={flash.id}
          className={
            flash.kind === 'xp'
              ? 'animate-float-up rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-accent-contrast shadow-accent'
              : flash.kind === 'level'
                ? 'animate-pop rounded-full bg-surface-raised px-4 py-2 text-[13px] font-semibold text-accent shadow-float ring-1 ring-accent/30'
                : 'animate-pop rounded-full bg-surface-raised px-4 py-2 text-[13px] font-semibold text-ember shadow-float ring-1 ring-ember/30'
          }
        >
          <span className="inline-flex items-center gap-1.5">
            {flash.kind === 'xp' && <Zap aria-hidden className="size-3.5" />}
            {flash.kind === 'level' && <Sparkles aria-hidden className="size-4" />}
            {flash.kind === 'streak' && <Flame aria-hidden className="size-4" />}
            {flash.text}
          </span>
        </div>
      ))}
    </div>
  );
}

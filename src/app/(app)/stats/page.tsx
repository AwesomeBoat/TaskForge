'use client';

import { BarChart3, Flame, Target, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTaskStore } from '@/features/tasks/task-store';

export default function StatsPage() {
  const { stats } = useTaskStore();
  return <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-24 pt-8 sm:px-6 sm:pb-10"><header><p className="text-sm font-semibold tracking-[0.14em] text-accent">PROGRESS</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">Your momentum, in view.</h1></header><Card><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-muted">Level</p><p className="mt-1 text-4xl font-semibold text-text">{stats.level}</p></div><Trophy className="size-5 text-ember" /></div><div className="mt-5"><div className="mb-2 flex justify-between text-xs text-muted"><span>{stats.xpIntoLevel} XP</span><span>{stats.xpForNextLevel} XP</span></div><ProgressBar value={stats.xpIntoLevel} max={stats.xpForNextLevel} label="Progress to next level" tone="ember" /></div><p className="mt-3 text-sm text-muted">{stats.xp} total XP earned</p></Card><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Card><Flame className="size-4 text-ember" /><p className="mt-3 text-2xl font-semibold text-text">{stats.streakCurrent}</p><p className="text-xs text-muted">Day streak</p></Card><Card><Target className="size-4 text-success" /><p className="mt-3 text-2xl font-semibold text-text">{stats.completedToday}</p><p className="text-xs text-muted">Done today</p></Card><Card><BarChart3 className="size-4 text-accent" /><p className="mt-3 text-2xl font-semibold text-text">{stats.xpToday}</p><p className="text-xs text-muted">XP today</p></Card><Card><p className="text-2xl font-semibold text-text">{stats.streakLongest}</p><p className="text-xs text-muted">Best streak</p></Card></div></div>;
}

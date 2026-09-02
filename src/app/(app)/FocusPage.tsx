'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ApiError, api, apiPost } from '@/lib/api-client';
import { useTaskStore } from '@/features/tasks/task-store';

export function FocusPage() {
  const { tasks } = useTaskStore();
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [taskId, setTaskId] = useState('');
  const [summary, setSummary] = useState({ sessions: 0, minutes: 0 });
  const [startedAt, setStartedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => { if (seconds === 0 && running) void finish(true); }, [seconds, running]);
  useEffect(() => { void api<{ summary: { sessions: number; minutes: number } }>('/api/focus-sessions').then(({ summary: value }) => setSummary(value)).catch(() => undefined); }, []);

  async function finish(completed: boolean) {
    const start = startedAt ?? new Date(Date.now() - (25 * 60 - seconds) * 1000).toISOString();
    try {
      await apiPost('/api/focus-sessions', { taskId: taskId || null, durationSeconds: Math.max(1, 25 * 60 - seconds), completed, startedAt: start });
      if (completed) setSummary((current) => ({ sessions: current.sessions + 1, minutes: current.minutes + Math.round((25 * 60 - seconds) / 60) }));
    } catch (caught) { if (caught instanceof ApiError) window.alert(caught.message); }
    setRunning(false); setStartedAt(null);
  }

  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const remainder = String(seconds % 60).padStart(2, '0');
  return <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-24 pt-8 sm:px-6 sm:pb-10"><header><p className="text-sm font-semibold tracking-[0.14em] text-accent">FOCUS</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">One quiet block at a time.</h1></header><Card className="text-center"><p className="font-mono text-7xl font-semibold tracking-tight text-text sm:text-8xl">{minutes}:{remainder}</p><div className="mx-auto mt-6 max-w-xs"><label htmlFor="focus-task" className="sr-only">Task</label><select id="focus-task" value={taskId} onChange={(event) => setTaskId(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"><option value="">No task selected</option>{tasks.filter((task) => task.status === 'todo').map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></div><div className="mt-6 flex justify-center gap-2">{running ? <Button size="lg" onClick={() => void finish(false)}><Pause className="size-4" />Stop</Button> : <Button size="lg" onClick={() => { setStartedAt(new Date().toISOString()); setRunning(true); }}><Play className="size-4" />Start focus</Button>}<Button size="icon" variant="secondary" aria-label="Reset timer" onClick={() => { setRunning(false); setSeconds(25 * 60); setStartedAt(null); }}><RotateCcw className="size-4" /></Button></div></Card><div className="grid grid-cols-2 gap-3"><Card><CheckCircle2 className="size-4 text-success" /><p className="mt-3 text-2xl font-semibold text-text">{summary.sessions}</p><p className="text-sm text-muted">Completed sessions</p></Card><Card><p className="text-2xl font-semibold text-text">{summary.minutes}</p><p className="text-sm text-muted">Focused minutes</p></Card></div></div>;
}

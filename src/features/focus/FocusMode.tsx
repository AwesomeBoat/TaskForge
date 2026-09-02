'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, CheckCircle2, Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { api, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { playCompletionChime } from '@/lib/sound';
import { useTaskStore } from '@/features/tasks/task-store';
import {
  elapsedSeconds,
  formatClock,
  FOCUS_SECONDS,
  initialTimer,
  pauseTimer,
  resetTimer,
  resumeTimer,
  startTimer,
  tickTimer,
  type TimerState,
} from './timer';

/** Below this, a stopped block is a misclick rather than work worth recording. */
const MIN_LOGGED_SECONDS = 60;

type Summary = { sessions: number; minutes: number };

export function FocusMode() {
  const { tasks, user, setCompleted } = useTaskStore();
  const toast = useToast();
  const searchParams = useSearchParams();

  const [timer, setTimer] = useState<TimerState>(initialTimer);
  const [taskId, setTaskId] = useState('');
  const [summary, setSummary] = useState<Summary>({ sessions: 0, minutes: 0 });
  const settledRef = useRef(false);

  const openTasks = tasks.filter((task) => task.status === 'todo');
  const selectedTask = tasks.find((task) => task.id === taskId) ?? null;

  // Deep link from a task's "Focus on this" action.
  useEffect(() => {
    const requested = searchParams.get('taskId');
    if (requested) setTaskId(requested);
  }, [searchParams]);

  useEffect(() => {
    void api<{ summary: Summary }>('/api/focus-sessions')
      .then(({ summary: value }) => setSummary(value))
      .catch(() => undefined);
  }, []);

  const logSession = useCallback(
    async (startedAt: string, seconds: number, completed: boolean) => {
      if (seconds < 1) return;
      try {
        await apiPost('/api/focus-sessions', {
          taskId: taskId || null,
          durationSeconds: seconds,
          completed,
          startedAt,
        });
        if (completed) {
          setSummary((current) => ({
            sessions: current.sessions + 1,
            minutes: current.minutes + Math.round(seconds / 60),
          }));
        }
      } catch {
        // The session record is a nicety; never let it break the timer.
      }
    },
    [taskId],
  );

  useEffect(() => {
    if (timer.phase !== 'running') return;
    const interval = window.setInterval(() => setTimer((current) => tickTimer(current, Date.now())), 250);
    return () => window.clearInterval(interval);
  }, [timer.phase]);

  // The block reaching zero is what counts as a finished session.
  useEffect(() => {
    if (timer.phase !== 'finished' || settledRef.current) return;
    settledRef.current = true;

    if (timer.startedAt) void logSession(timer.startedAt, FOCUS_SECONDS, true);
    toast.success('Focus block complete. Take a break.');
    if (user.soundEnabled) playCompletionChime();
  }, [logSession, timer.phase, timer.startedAt, toast, user.soundEnabled]);

  // Keeps the countdown readable when the tab is in the background.
  useEffect(() => {
    if (timer.phase !== 'running') {
      document.title = 'TaskForge';
      return;
    }
    document.title = `${formatClock(timer.remaining)} · Focus`;
    return () => {
      document.title = 'TaskForge';
    };
  }, [timer.phase, timer.remaining]);

  const start = () => {
    settledRef.current = false;
    setTimer((current) => startTimer(current, Date.now(), new Date().toISOString()));
  };

  const pause = () => setTimer((current) => pauseTimer(current, Date.now()));
  const resume = () => setTimer((current) => resumeTimer(current, Date.now()));

  const reset = () => {
    const elapsed = elapsedSeconds(timer);
    if (timer.phase !== 'finished' && timer.startedAt && elapsed >= MIN_LOGGED_SECONDS) {
      void logSession(timer.startedAt, elapsed, false);
    }
    settledRef.current = false;
    setTimer(resetTimer());
  };

  const completeSelectedTask = async () => {
    if (!selectedTask || selectedTask.status === 'completed') return;
    await setCompleted(selectedTask.id, true);
  };

  const progress = 1 - timer.remaining / FOCUS_SECONDS;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-24 pt-6 sm:px-6 sm:pb-10 sm:pt-8">
      <header>
        <p className="text-sm font-semibold tracking-[0.14em] text-accent">FOCUS</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">One quiet block at a time.</h1>
      </header>

      <Card
        className={cn(
          'relative overflow-hidden text-center transition-shadow duration-500',
          timer.phase === 'finished' && 'shadow-accent ring-1 ring-accent/40',
        )}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5 bg-accent transition-[width] duration-500 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />

        <p
          role="timer"
          aria-live="off"
          className={cn(
            'font-mono text-7xl font-semibold tracking-tight tabular-nums sm:text-8xl',
            timer.phase === 'finished' ? 'text-accent' : 'text-text',
            timer.phase === 'paused' && 'text-muted',
          )}
        >
          {formatClock(timer.remaining)}
        </p>

        <p aria-live="polite" className="mt-2 min-h-5 text-[13px] font-medium">
          {timer.phase === 'finished' && <span className="text-accent">Time&rsquo;s up — nice work.</span>}
          {timer.phase === 'paused' && <span className="text-muted">Paused</span>}
          {timer.phase === 'running' && <span className="text-muted">Focusing…</span>}
          {timer.phase === 'idle' && <span className="text-faint">25 minute block</span>}
        </p>

        <div className="mx-auto mt-5 max-w-xs">
          <label htmlFor="focus-task" className="mb-1.5 block text-left text-[13px] font-medium text-muted">
            Working on
          </label>
          <select
            id="focus-task"
            value={taskId}
            onChange={(event) => setTaskId(event.target.value)}
            disabled={timer.phase === 'running'}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text transition-colors hover:border-border-strong focus:border-accent focus:outline-none disabled:opacity-60"
          >
            <option value="">No task selected</option>
            {selectedTask?.status === 'completed' && (
              <option value={selectedTask.id}>{selectedTask.title} (done)</option>
            )}
            {openTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {(timer.phase === 'idle' || timer.phase === 'finished') && (
            <Button variant="primary" onClick={start}>
              <Play className="size-4" />
              {timer.phase === 'finished' ? 'Start another' : 'Start focus'}
            </Button>
          )}
          {timer.phase === 'running' && (
            <Button variant="secondary" onClick={pause}>
              <Pause className="size-4" />
              Pause
            </Button>
          )}
          {timer.phase === 'paused' && (
            <Button variant="primary" onClick={resume}>
              <Play className="size-4" />
              Resume
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={reset}
            disabled={timer.phase === 'idle' && timer.remaining === FOCUS_SECONDS}
          >
            <RotateCcw className="size-4" />
            Reset
          </Button>

          {selectedTask?.status === 'todo' && (
            <Button variant="secondary" onClick={() => void completeSelectedTask()}>
              <Check className="size-4" />
              Mark done
            </Button>
          )}
        </div>

        {selectedTask && (
          <p className="mt-4 text-[13px] text-muted">
            {selectedTask.status === 'completed' ? (
              <span className="inline-flex items-center gap-1.5 text-success">
                <CheckCircle2 className="size-3.5" />
                {selectedTask.title}
              </span>
            ) : (
              <span className="italic">“{selectedTask.title}”</span>
            )}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CheckCircle2 className="size-4 text-success" />
          <p className="mt-3 text-2xl font-semibold tabular-nums text-text">{summary.sessions}</p>
          <p className="text-sm text-muted">Completed sessions</p>
        </Card>
        <Card>
          <Timer className="size-4 text-accent" />
          <p className="mt-3 text-2xl font-semibold tabular-nums text-text">{summary.minutes}</p>
          <p className="text-sm text-muted">Focused minutes</p>
        </Card>
      </div>
    </div>
  );
}

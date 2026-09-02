'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ApiError, apiDelete, apiPatch, apiPost, api } from '@/lib/api-client';
import { browserTimezone } from '@/lib/dates';
import { playCompletionChime } from '@/lib/sound';
import { levelProgress } from '@/lib/xp';
import type { CurrentUser, Stats, Task, TaskPriority, ThemePreference } from '@/types';

export type NewTaskInput = {
  title: string;
  description?: string | null;
  priority: TaskPriority;
  dueDate?: string | null;
  tags?: string[];
};

export type TaskPatch = Partial<NewTaskInput>;

type Reward = {
  id: number;
  xp: number;
  level: number;
  streak: number;
  streakIncreased: boolean;
  leveledUp: boolean;
};

type TaskStoreValue = {
  tasks: Task[];
  stats: Stats;
  tags: string[];
  user: CurrentUser;
  today: string;
  pendingIds: ReadonlySet<string>;
  reward: Reward | null;
  createTask: (input: NewTaskInput) => Promise<boolean>;
  updateTask: (id: string, patch: TaskPatch) => Promise<boolean>;
  deleteTask: (id: string) => Promise<void>;
  setCompleted: (id: string, completed: boolean) => Promise<void>;
  clearCompleted: () => Promise<void>;
  updatePreferences: (patch: { theme?: ThemePreference; soundEnabled?: boolean; displayName?: string }) => Promise<void>;
};

const TaskStoreContext = createContext<TaskStoreValue | null>(null);

export function TaskStoreProvider({
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
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [user, setUser] = useState<CurrentUser>(initialUser);
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [reward, setReward] = useState<Reward | null>(null);
  const rewardId = useRef(0);
  const tempId = useRef(0);
  const statsTimer = useRef<number | null>(null);

  const markPending = useCallback((id: string, pending: boolean) => {
    setPendingIds((current) => {
      const next = new Set(current);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  /** Server stats are the source of truth; optimistic numbers are reconciled here. */
  const scheduleStatsRefresh = useCallback(() => {
    if (statsTimer.current) window.clearTimeout(statsTimer.current);
    statsTimer.current = window.setTimeout(async () => {
      try {
        const { stats: fresh } = await api<{ stats: Stats }>(
          `/api/stats?timezone=${encodeURIComponent(browserTimezone())}`,
        );
        setStats(fresh);
      } catch {
        // A stale counter is not worth interrupting the user for.
      }
    }, 900);
  }, []);

  // The browser is the only thing that knows where the user actually is.
  useEffect(() => {
    const timezone = browserTimezone();
    if (timezone === user.timezone) return;
    void apiPatch<{ user: CurrentUser }>('/api/me', { timezone })
      .then(({ user: updated }) => setUser(updated))
      .catch(() => undefined);
  }, [user.timezone]);

  useEffect(() => () => window.clearTimeout(statsTimer.current ?? undefined), []);

  const createTask = useCallback(
    async (input: NewTaskInput) => {
      const optimisticId = `temp-${tempId.current++}`;
      const now = new Date().toISOString();
      const optimistic: Task = {
        id: optimisticId,
        title: input.title,
        description: input.description ?? null,
        status: 'todo',
        priority: input.priority,
        dueDate: input.dueDate ?? null,
        xpAwarded: 0,
        tags: input.tags ?? [],
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      };
      setTasks((current) => [optimistic, ...current]);
      markPending(optimisticId, true);

      try {
        const { task } = await apiPost<{ task: Task }>('/api/tasks', input);
        setTasks((current) => current.map((item) => (item.id === optimisticId ? task : item)));
        scheduleStatsRefresh();
        return true;
      } catch (error) {
        setTasks((current) => current.filter((item) => item.id !== optimisticId));
        toast.error(error instanceof ApiError ? error.message : 'Could not create that task.');
        return false;
      } finally {
        markPending(optimisticId, false);
      }
    },
    [markPending, scheduleStatsRefresh, toast],
  );

  const updateTask = useCallback(
    async (id: string, patch: TaskPatch) => {
      const previous = tasks.find((task) => task.id === id);
      if (!previous) return false;

      setTasks((current) =>
        current.map((task) => (task.id === id ? { ...task, ...patch, tags: patch.tags ?? task.tags } : task)),
      );
      markPending(id, true);

      try {
        const { task } = await apiPatch<{ task: Task }>(`/api/tasks/${id}`, patch);
        setTasks((current) => current.map((item) => (item.id === id ? task : item)));
        scheduleStatsRefresh();
        return true;
      } catch (error) {
        setTasks((current) => current.map((item) => (item.id === id ? previous : item)));
        toast.error(error instanceof ApiError ? error.message : 'Could not save that change.');
        return false;
      } finally {
        markPending(id, false);
      }
    },
    [markPending, scheduleStatsRefresh, tasks, toast],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const snapshot = tasks;
      setTasks((current) => current.filter((task) => task.id !== id));
      try {
        await apiDelete(`/api/tasks/${id}`);
        scheduleStatsRefresh();
      } catch (error) {
        setTasks(snapshot);
        toast.error(error instanceof ApiError ? error.message : 'Could not delete that task.');
      }
    },
    [scheduleStatsRefresh, tasks, toast],
  );

  const setCompleted = useCallback(
    async (id: string, completed: boolean) => {
      const previous = tasks.find((task) => task.id === id);
      if (!previous || previous.id.startsWith('temp-')) return;

      const wasDue = previous.dueDate !== null && previous.dueDate <= stats.today;
      setTasks((current) =>
        current.map((task) =>
          task.id === id
            ? { ...task, status: completed ? 'completed' : 'todo', completedAt: completed ? new Date().toISOString() : null }
            : task,
        ),
      );
      markPending(id, true);

      try {
        const result = await apiPost<{
          task: Task;
          xpGained: number;
          level: number;
          streak: { current: number; longest: number; increased: boolean };
        }>(`/api/tasks/${id}/complete`, { completed, timezone: browserTimezone() });

        setTasks((current) => current.map((task) => (task.id === id ? result.task : task)));

        const progress = levelProgress(stats.xp + result.xpGained);
        setStats((current) => ({
          ...current,
          xp: progress.totalXp,
          level: progress.level,
          xpIntoLevel: progress.xpIntoLevel,
          xpForNextLevel: progress.xpForNextLevel,
          streakCurrent: result.streak.current,
          streakLongest: result.streak.longest,
          xpToday: Math.max(0, current.xpToday + result.xpGained),
          completedToday: Math.max(0, current.completedToday + (completed ? 1 : -1)),
          dueToday: Math.max(0, current.dueToday + (wasDue ? (completed ? -1 : 1) : 0)),
        }));

        if (completed) {
          rewardId.current += 1;
          setReward({
            id: rewardId.current,
            xp: result.xpGained,
            level: result.level,
            streak: result.streak.current,
            streakIncreased: result.streak.increased,
            leveledUp: result.level > stats.level,
          });
          if (user.soundEnabled) playCompletionChime();
        }
        scheduleStatsRefresh();
      } catch (error) {
        setTasks((current) => current.map((task) => (task.id === id ? previous : task)));
        toast.error(error instanceof ApiError ? error.message : 'Could not update that task.');
      } finally {
        markPending(id, false);
      }
    },
    [markPending, scheduleStatsRefresh, stats.level, stats.today, stats.xp, tasks, toast, user.soundEnabled],
  );

  const clearCompleted = useCallback(async () => {
    const snapshot = tasks;
    setTasks((current) => current.filter((task) => task.status !== 'completed'));
    try {
      await apiDelete('/api/tasks/completed');
      scheduleStatsRefresh();
    } catch (error) {
      setTasks(snapshot);
      toast.error(error instanceof ApiError ? error.message : 'Could not clear the history.');
    }
  }, [scheduleStatsRefresh, tasks, toast]);

  const updatePreferences = useCallback<TaskStoreValue['updatePreferences']>(
    async (patch) => {
      const previous = user;
      setUser((current) => ({ ...current, ...patch }));
      try {
        const { user: updated } = await apiPatch<{ user: CurrentUser }>('/api/me', patch);
        setUser(updated);
      } catch {
        setUser(previous);
        toast.error('Could not save that preference.');
      }
    },
    [toast, user],
  );

  const tags = useMemo(() => {
    const all = new Set(initialTags);
    for (const task of tasks) for (const tag of task.tags) all.add(tag);
    return [...all].sort();
  }, [initialTags, tasks]);

  const value = useMemo<TaskStoreValue>(
    () => ({
      tasks,
      stats,
      tags,
      user,
      today: stats.today,
      pendingIds,
      reward,
      createTask,
      updateTask,
      deleteTask,
      setCompleted,
      clearCompleted,
      updatePreferences,
    }),
    [
      clearCompleted,
      createTask,
      deleteTask,
      pendingIds,
      reward,
      setCompleted,
      stats,
      tags,
      tasks,
      updatePreferences,
      updateTask,
      user,
    ],
  );

  return <TaskStoreContext.Provider value={value}>{children}</TaskStoreContext.Provider>;
}

export function useTaskStore(): TaskStoreValue {
  const context = useContext(TaskStoreContext);
  if (!context) throw new Error('useTaskStore must be used inside <TaskStoreProvider>');
  return context;
}

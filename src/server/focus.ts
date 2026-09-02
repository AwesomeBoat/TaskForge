import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { focusSessions, tasks } from '@/db/schema';
import { notFound } from './http';

export type FocusSessionInput = {
  taskId?: string | null;
  durationSeconds: number;
  completed: boolean;
  startedAt: string;
};

export async function recordFocusSession(userId: string, input: FocusSessionInput) {
  if (input.taskId) {
    // A focus session may only ever point at the caller's own task.
    const owned = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, input.taskId), eq(tasks.userId, userId)))
      .limit(1);
    if (!owned[0]) throw notFound('That task does not exist.');
  }

  const inserted = await db
    .insert(focusSessions)
    .values({
      userId,
      taskId: input.taskId ?? null,
      durationSeconds: input.durationSeconds,
      completed: input.completed,
      startedAt: new Date(input.startedAt),
    })
    .returning({ id: focusSessions.id });

  const row = inserted[0];
  if (!row) throw new Error('Focus session insert returned no row');
  return { id: row.id };
}

export async function focusSummary(userId: string) {
  const [row] = await db
    .select({
      sessions: sql<number>`count(*) filter (where ${focusSessions.completed})::int`,
      minutes: sql<number>`coalesce(sum(${focusSessions.durationSeconds}) filter (where ${focusSessions.completed}), 0)::int / 60`,
    })
    .from(focusSessions)
    .where(eq(focusSessions.userId, userId));

  return { sessions: row?.sessions ?? 0, minutes: row?.minutes ?? 0 };
}

export async function recentFocusTaskIds(userId: string, limit = 5): Promise<string[]> {
  const rows = await db
    .select({ taskId: focusSessions.taskId })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, userId), sql`${focusSessions.taskId} is not null`))
    .orderBy(desc(focusSessions.startedAt))
    .limit(limit);
  return rows.map((row) => row.taskId).filter((id): id is string => id !== null);
}

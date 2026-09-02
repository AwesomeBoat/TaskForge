import { and, eq, isNotNull, lte, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import type { UserRow } from '@/db/schema';
import { tasks } from '@/db/schema';
import { addDays, localDateIn } from '@/lib/dates';
import { levelProgress } from '@/lib/xp';
import type { Stats } from '@/types';

/**
 * A streak is stored as "last day a task was completed" plus a counter, and
 * decays when read. No cron job, and a user who was active yesterday still sees
 * their streak this morning.
 */
export function currentStreak(user: Pick<UserRow, 'streakCurrent' | 'lastCompletedDate'>, today: string): number {
  if (!user.lastCompletedDate) return 0;
  if (user.lastCompletedDate === today || user.lastCompletedDate === addDays(today, -1)) return user.streakCurrent;
  return 0;
}

export async function getStats(user: UserRow, timezone: string): Promise<Stats> {
  const today = localDateIn(timezone);

  const [todayRow] = await db
    .select({
      completed: sql<number>`count(*)::int`,
      xp: sql<number>`coalesce(sum(${tasks.xpAwarded}), 0)::int`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, user.id),
        eq(tasks.status, 'completed'),
        sql`(${tasks.completedAt} at time zone ${timezone})::date = ${today}::date`,
      ),
    );

  const [dueRow] = await db
    .select({ due: sql<number>`count(*)::int` })
    .from(tasks)
    .where(
      and(eq(tasks.userId, user.id), eq(tasks.status, 'todo'), isNotNull(tasks.dueDate), lte(tasks.dueDate, today)),
    );

  const progress = levelProgress(user.xp);

  return {
    xp: progress.totalXp,
    level: progress.level,
    xpIntoLevel: progress.xpIntoLevel,
    xpForNextLevel: progress.xpForNextLevel,
    streakCurrent: currentStreak(user, today),
    streakLongest: user.streakLongest,
    xpToday: todayRow?.xp ?? 0,
    completedToday: todayRow?.completed ?? 0,
    dueToday: dueRow?.due ?? 0,
    today,
  };
}

import { and, asc, desc, eq, gt, inArray, isNotNull, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import type { Db } from '@/db/client';
import { tags, taskTags, tasks, users } from '@/db/schema';
import type { TaskRow } from '@/db/schema';
import { addDays, localDateIn } from '@/lib/dates';
import type { CreateTaskInput, TaskQuery, UpdateTaskInput } from '@/lib/validation';
import { levelProgress, XP_BY_PRIORITY } from '@/lib/xp';
import type { Task } from '@/types';
import { notFound } from './http';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Queryable = Db | Tx;

function serializeTask(row: TaskRow, taskTagNames: string[]): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.dueDate,
    xpAwarded: row.xpAwarded,
    tags: taskTagNames,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

/** One extra query for every task in the page, instead of one query per task. */
async function tagsByTask(client: Queryable, taskIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (taskIds.length === 0) return map;

  const rows = await client
    .select({ taskId: taskTags.taskId, name: tags.name })
    .from(taskTags)
    .innerJoin(tags, eq(tags.id, taskTags.tagId))
    .where(inArray(taskTags.taskId, taskIds))
    .orderBy(asc(tags.name));

  for (const row of rows) {
    const existing = map.get(row.taskId);
    if (existing) existing.push(row.name);
    else map.set(row.taskId, [row.name]);
  }
  return map;
}

async function hydrate(client: Queryable, rows: TaskRow[]): Promise<Task[]> {
  const tagMap = await tagsByTask(
    client,
    rows.map((row) => row.id),
  );
  return rows.map((row) => serializeTask(row, tagMap.get(row.id) ?? []));
}

/** LIKE wildcards in user input are literals, not operators. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

const PRIORITY_RANK = sql`case ${tasks.priority} when 'high' then 3 when 'medium' then 2 else 1 end`;

export async function listTasks(userId: string, query: TaskQuery, timezone: string): Promise<Task[]> {
  const today = localDateIn(query.timezone ?? timezone);
  const filters = [eq(tasks.userId, userId)];

  switch (query.view) {
    case 'inbox':
      filters.push(eq(tasks.status, 'todo'));
      break;
    case 'today':
      // Overdue work belongs to today too — hiding it is how tasks get lost.
      filters.push(eq(tasks.status, 'todo'), isNotNull(tasks.dueDate), lte(tasks.dueDate, today));
      break;
    case 'upcoming':
      filters.push(eq(tasks.status, 'todo'), gt(tasks.dueDate, today));
      break;
    case 'completed':
      filters.push(eq(tasks.status, 'completed'));
      break;
    case 'important':
      filters.push(eq(tasks.status, 'todo'), eq(tasks.priority, 'high'));
      break;
    case 'all':
      break;
  }

  if (query.search) {
    const pattern = `%${escapeLike(query.search)}%`;
    const match = or(
      sql`${tasks.title} ilike ${pattern}`,
      sql`coalesce(${tasks.description}, '') ilike ${pattern}`,
    );
    if (match) filters.push(match);
  }
  if (query.priority) filters.push(eq(tasks.priority, query.priority));
  if (query.tag) {
    filters.push(
      sql`exists (
        select 1 from ${taskTags}
        inner join ${tags} on ${tags.id} = ${taskTags.tagId}
        where ${taskTags.taskId} = ${tasks.id} and ${tags.userId} = ${userId} and ${tags.name} = ${query.tag}
      )`,
    );
  }

  const direction = query.direction === 'asc' ? asc : desc;
  const orderBy = {
    created: direction(tasks.createdAt),
    due:
      query.direction === 'asc'
        ? sql`${tasks.dueDate} asc nulls last`
        : sql`${tasks.dueDate} desc nulls last`,
    priority: query.direction === 'asc' ? asc(PRIORITY_RANK) : desc(PRIORITY_RANK),
    title: direction(tasks.title),
  }[query.sort];

  const rows = await db
    .select()
    .from(tasks)
    .where(and(...filters))
    .orderBy(orderBy, desc(tasks.createdAt))
    .limit(query.limit)
    .offset(query.offset);

  return hydrate(db, rows);
}

async function requireOwnedTask(client: Queryable, userId: string, taskId: string): Promise<TaskRow> {
  const rows = await client
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);
  const row = rows[0];
  // Same answer whether the task belongs to someone else or does not exist.
  if (!row) throw notFound('That task does not exist.');
  return row;
}

export async function getTask(userId: string, taskId: string): Promise<Task> {
  const row = await requireOwnedTask(db, userId, taskId);
  const [task] = await hydrate(db, [row]);
  if (!task) throw notFound('That task does not exist.');
  return task;
}

/** Tags are per-user rows; a name is created on first use and reused afterwards. */
async function syncTags(client: Queryable, userId: string, taskId: string, names: string[]): Promise<void> {
  const unique = [...new Set(names)];
  await client.delete(taskTags).where(eq(taskTags.taskId, taskId));
  if (unique.length === 0) return;

  await client
    .insert(tags)
    .values(unique.map((name) => ({ userId, name })))
    .onConflictDoNothing();

  const owned = await client
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.name, unique)));

  if (owned.length > 0) {
    await client.insert(taskTags).values(owned.map((tag) => ({ taskId, tagId: tag.id })));
  }
}

export async function createTask(userId: string, input: CreateTaskInput): Promise<Task> {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(tasks)
      .values({
        userId,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        dueDate: input.dueDate ?? null,
      })
      .returning();

    const row = inserted[0];
    if (!row) throw new Error('Task insert returned no row');
    if (input.tags?.length) await syncTags(tx, userId, row.id, input.tags);

    const [task] = await hydrate(tx, [row]);
    if (!task) throw new Error('Task hydrate failed');
    return task;
  });
}

export async function updateTask(userId: string, taskId: string, input: UpdateTaskInput): Promise<Task> {
  return db.transaction(async (tx) => {
    await requireOwnedTask(tx, userId, taskId);

    const patch: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() };
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description ?? null;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.dueDate !== undefined) patch.dueDate = input.dueDate ?? null;

    const updated = await tx
      .update(tasks)
      .set(patch)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    const row = updated[0];
    if (!row) throw notFound('That task does not exist.');
    if (input.tags !== undefined) await syncTags(tx, userId, taskId, input.tags);

    const [task] = await hydrate(tx, [row]);
    if (!task) throw new Error('Task hydrate failed');
    return task;
  });
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const deleted = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning({ id: tasks.id });
  if (deleted.length === 0) throw notFound('That task does not exist.');
}

export type CompletionResult = {
  task: Task;
  xpGained: number;
  streak: { current: number; longest: number; increased: boolean };
  level: number;
};

/**
 * Completing a task is the only place XP and streaks move, and it is a single
 * transaction: XP can be granted once per task (`xp_awarded`), so re-completing
 * a restored task never pays twice.
 */
export async function setTaskCompletion(
  userId: string,
  taskId: string,
  completed: boolean,
  timezone: string,
): Promise<CompletionResult> {
  return db.transaction(async (tx) => {
    const row = await requireOwnedTask(tx, userId, taskId);
    const userRows = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userRows[0];
    if (!user) throw notFound('Account not found.');

    const alreadyInState = (row.status === 'completed') === completed;
    let xpGained = 0;
    let streakCurrent = user.streakCurrent;
    let streakLongest = user.streakLongest;
    let streakIncreased = false;
    let updatedRow = row;

    if (!alreadyInState) {
      if (completed) {
        xpGained = row.xpAwarded > 0 ? 0 : XP_BY_PRIORITY[row.priority];
        const completedRows = await tx
          .update(tasks)
          .set({
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date(),
            xpAwarded: row.xpAwarded > 0 ? row.xpAwarded : xpGained,
          })
          .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
          .returning();
        if (!completedRows[0]) throw notFound('That task does not exist.');
        updatedRow = completedRows[0];

        const today = localDateIn(timezone);
        if (user.lastCompletedDate !== today) {
          streakCurrent = user.lastCompletedDate === addDays(today, -1) ? user.streakCurrent + 1 : 1;
          streakLongest = Math.max(user.streakLongest, streakCurrent);
          streakIncreased = true;
        }

        await tx
          .update(users)
          .set({
            xp: user.xp + xpGained,
            streakCurrent,
            streakLongest,
            lastCompletedDate: today,
            timezone,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      } else {
        // Restoring keeps the XP already earned; it just can never be earned again.
        const restored = await tx
          .update(tasks)
          .set({ status: 'todo', completedAt: null, updatedAt: new Date() })
          .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
          .returning();
        if (!restored[0]) throw notFound('That task does not exist.');
        updatedRow = restored[0];
      }
    }

    const [task] = await hydrate(tx, [updatedRow]);
    if (!task) throw new Error('Task hydrate failed');

    return {
      task,
      xpGained,
      streak: { current: streakCurrent, longest: streakLongest, increased: streakIncreased },
      level: levelProgress(user.xp + xpGained).level,
    };
  });
}

export async function clearCompletedTasks(userId: string): Promise<number> {
  const deleted = await db
    .delete(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.status, 'completed')))
    .returning({ id: tasks.id });
  return deleted.length;
}

export async function listUserTags(userId: string): Promise<string[]> {
  const rows = await db
    .select({ name: tags.name })
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(asc(tags.name));
  return rows.map((row) => row.name);
}

/** Tags stop existing for a user once nothing references them. */
export async function pruneOrphanTags(userId: string): Promise<void> {
  await db.delete(tags).where(
    and(
      eq(tags.userId, userId),
      sql`not exists (select 1 from ${taskTags} where ${taskTags.tagId} = ${tags.id})`,
    ),
  );
}

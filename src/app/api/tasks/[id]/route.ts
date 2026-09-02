import { z } from 'zod';
import { requireApiUser } from '@/server/auth';
import { apiHandler, json, parseJsonBody } from '@/server/http';
import { checkRateLimit } from '@/server/rate-limit';
import { deleteTask, getTask, pruneOrphanTags, updateTask } from '@/server/tasks';
import { updateTaskSchema } from '@/lib/validation';

const paramsSchema = z.object({ id: z.uuid('Unknown task.') });

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  return apiHandler(async () => {
    const user = await requireApiUser(request);
    const { id } = paramsSchema.parse(await context.params);
    return json({ task: await getTask(user.id, id) });
  });
}

export async function PATCH(request: Request, context: Context): Promise<Response> {
  return apiHandler(async () => {
    const user = await requireApiUser(request);
    checkRateLimit(`tasks-write:${user.id}`, 240, 60 * 1000);

    const { id } = paramsSchema.parse(await context.params);
    const input = updateTaskSchema.parse(await parseJsonBody(request));
    const task = await updateTask(user.id, id, input);
    if (input.tags !== undefined) await pruneOrphanTags(user.id);
    return json({ task });
  });
}

export async function DELETE(request: Request, context: Context): Promise<Response> {
  return apiHandler(async () => {
    const user = await requireApiUser(request);
    checkRateLimit(`tasks-write:${user.id}`, 240, 60 * 1000);

    const { id } = paramsSchema.parse(await context.params);
    await deleteTask(user.id, id);
    await pruneOrphanTags(user.id);
    return json({ ok: true });
  });
}

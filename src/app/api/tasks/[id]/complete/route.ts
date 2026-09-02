import { z } from 'zod';
import { requireApiUser } from '@/server/auth';
import { apiHandler, json, parseJsonBody } from '@/server/http';
import { checkRateLimit } from '@/server/rate-limit';
import { setTaskCompletion } from '@/server/tasks';
import { completeTaskSchema } from '@/lib/validation';

const paramsSchema = z.object({ id: z.uuid('Unknown task.') });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  return apiHandler(async () => {
    const user = await requireApiUser(request);
    checkRateLimit(`tasks-write:${user.id}`, 240, 60 * 1000);

    const { id } = paramsSchema.parse(await context.params);
    const input = completeTaskSchema.parse(await parseJsonBody(request));
    // The client may report a timezone, but the clock is always the server's.
    const timezone = input.timezone ?? user.timezone;
    const result = await setTaskCompletion(user.id, id, input.completed, timezone);
    return json(result);
  });
}

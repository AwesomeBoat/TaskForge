import { requireApiUser } from '@/server/auth';
import { apiHandler, json, parseJsonBody } from '@/server/http';
import { checkRateLimit } from '@/server/rate-limit';
import { createTask, listTasks } from '@/server/tasks';
import { createTaskSchema, taskQuerySchema } from '@/lib/validation';

export async function GET(request: Request): Promise<Response> {
  return apiHandler(async () => {
    const user = await requireApiUser(request);
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const query = taskQuerySchema.parse(params);
    const tasks = await listTasks(user.id, query, user.timezone);
    return json({ tasks });
  });
}

export async function POST(request: Request): Promise<Response> {
  return apiHandler(async () => {
    const user = await requireApiUser(request);
    checkRateLimit(`tasks-write:${user.id}`, 240, 60 * 1000);

    const input = createTaskSchema.parse(await parseJsonBody(request));
    const task = await createTask(user.id, input);
    return json({ task }, { status: 201 });
  });
}

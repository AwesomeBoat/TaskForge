import { requireApiUser } from '@/server/auth';
import { apiHandler, json } from '@/server/http';
import { checkRateLimit } from '@/server/rate-limit';
import { clearCompletedTasks, pruneOrphanTags } from '@/server/tasks';

/** Empties the completed history. XP and streaks already earned are untouched. */
export async function DELETE(request: Request): Promise<Response> {
  return apiHandler(async () => {
    const user = await requireApiUser(request);
    checkRateLimit(`tasks-write:${user.id}`, 240, 60 * 1000);

    const removed = await clearCompletedTasks(user.id);
    await pruneOrphanTags(user.id);
    return json({ removed });
  });
}

import { requireApiUser } from '@/server/auth';
import { focusSummary, recordFocusSession } from '@/server/focus';
import { apiHandler, json, parseJsonBody } from '@/server/http';
import { checkRateLimit } from '@/server/rate-limit';
import { focusSessionSchema } from '@/lib/validation';

export async function GET(request: Request): Promise<Response> {
  return apiHandler(async () => {
    const user = await requireApiUser(request);
    return json({ summary: await focusSummary(user.id) });
  });
}

export async function POST(request: Request): Promise<Response> {
  return apiHandler(async () => {
    const user = await requireApiUser(request);
    checkRateLimit(`focus:${user.id}`, 60, 60 * 1000);

    const input = focusSessionSchema.parse(await parseJsonBody(request));
    const session = await recordFocusSession(user.id, input);
    return json({ session }, { status: 201 });
  });
}

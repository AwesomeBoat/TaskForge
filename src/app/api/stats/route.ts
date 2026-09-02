import { requireApiUser } from '@/server/auth';
import { apiHandler, json } from '@/server/http';
import { getStats } from '@/server/stats';
import { timezoneSchema } from '@/lib/validation';

export async function GET(request: Request): Promise<Response> {
  return apiHandler(async () => {
    const user = await requireApiUser(request);
    const requested = new URL(request.url).searchParams.get('timezone');
    const timezone = requested ? timezoneSchema.parse(requested) : user.timezone;
    return json({ stats: await getStats(user, timezone) });
  });
}

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema';
import { publicUser } from '@/server/account';
import { requireApiUser } from '@/server/auth';
import { apiHandler, json, parseJsonBody } from '@/server/http';
import { checkRateLimit } from '@/server/rate-limit';
import { preferencesSchema } from '@/lib/validation';

export async function GET(request: Request): Promise<Response> {
  return apiHandler(async () => {
    const user = await requireApiUser(request);
    return json({ user: publicUser(user) });
  });
}

export async function PATCH(request: Request): Promise<Response> {
  return apiHandler(async () => {
    const user = await requireApiUser(request);
    checkRateLimit(`me-write:${user.id}`, 60, 60 * 1000);

    const input = preferencesSchema.parse(await parseJsonBody(request));
    const updated = await db
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();

    const row = updated[0];
    if (!row) throw new Error('Preferences update returned no row');
    return json({ user: publicUser(row) });
  });
}

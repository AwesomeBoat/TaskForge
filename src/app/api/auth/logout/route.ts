import { apiHandler, assertSameOrigin, json } from '@/server/http';
import { clearSessionCookie, destroySession, readSessionCookie } from '@/server/session';

export async function POST(request: Request): Promise<Response> {
  return apiHandler(async () => {
    assertSameOrigin(request);
    await destroySession(await readSessionCookie());
    await clearSessionCookie();
    return json({ ok: true });
  });
}

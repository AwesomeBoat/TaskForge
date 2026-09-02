import { registerUser, publicUser } from '@/server/account';
import { apiHandler, assertSameOrigin, json, parseJsonBody } from '@/server/http';
import { checkRateLimit, clientIp } from '@/server/rate-limit';
import { createSession, setSessionCookie } from '@/server/session';
import { signupSchema } from '@/lib/validation';

export async function POST(request: Request): Promise<Response> {
  return apiHandler(async () => {
    assertSameOrigin(request);
    checkRateLimit(`signup:${clientIp(request)}`, 5, 60 * 60 * 1000);

    const input = signupSchema.parse(await parseJsonBody(request));
    const user = await registerUser({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
      timezone: input.timezone ?? 'UTC',
    });

    const { token, expiresAt } = await createSession(user.id);
    await setSessionCookie(token, expiresAt);
    return json({ user: publicUser(user) }, { status: 201 });
  });
}

import { authenticate, publicUser, updateTimezoneIfChanged } from '@/server/account';
import { apiHandler, assertSameOrigin, json, parseJsonBody, unauthorized } from '@/server/http';
import { checkRateLimit, clientIp } from '@/server/rate-limit';
import { createSession, purgeExpiredSessions, setSessionCookie } from '@/server/session';
import { loginSchema } from '@/lib/validation';

export async function POST(request: Request): Promise<Response> {
  return apiHandler(async () => {
    assertSameOrigin(request);
    const ip = clientIp(request);
    checkRateLimit(`login-ip:${ip}`, 20, 15 * 60 * 1000);

    const input = loginSchema.parse(await parseJsonBody(request));
    // Also limit per account so one address cannot be brute-forced from many IPs.
    checkRateLimit(`login-account:${input.email}`, 10, 15 * 60 * 1000);

    const user = await authenticate(input.email, input.password);
    if (!user) throw unauthorized('Incorrect email or password.');

    await updateTimezoneIfChanged(user, input.timezone);
    const { token, expiresAt } = await createSession(user.id);
    await setSessionCookie(token, expiresAt);
    void purgeExpiredSessions().catch(() => undefined);

    return json({ user: publicUser({ ...user, timezone: input.timezone ?? user.timezone }) });
  });
}

import { resetPasswordWithToken } from '@/server/account';
import { apiHandler, assertSameOrigin, json, parseJsonBody } from '@/server/http';
import { checkRateLimit, clientIp } from '@/server/rate-limit';
import { clearSessionCookie } from '@/server/session';
import { resetPasswordSchema } from '@/lib/validation';

export async function POST(request: Request): Promise<Response> {
  return apiHandler(async () => {
    assertSameOrigin(request);
    checkRateLimit(`reset:${clientIp(request)}`, 10, 60 * 60 * 1000);

    const input = resetPasswordSchema.parse(await parseJsonBody(request));
    await resetPasswordWithToken(input.token, input.password);
    await clearSessionCookie();

    return json({ ok: true });
  });
}

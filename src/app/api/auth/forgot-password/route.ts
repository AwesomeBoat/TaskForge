import { createPasswordResetToken } from '@/server/account';
import { apiHandler, assertSameOrigin, json, parseJsonBody } from '@/server/http';
import { deliverPasswordReset } from '@/server/mailer';
import { checkRateLimit, clientIp } from '@/server/rate-limit';
import { forgotPasswordSchema } from '@/lib/validation';

export async function POST(request: Request): Promise<Response> {
  return apiHandler(async () => {
    assertSameOrigin(request);
    checkRateLimit(`forgot:${clientIp(request)}`, 5, 60 * 60 * 1000);

    const input = forgotPasswordSchema.parse(await parseJsonBody(request));
    const issued = await createPasswordResetToken(input.email);
    if (issued) await deliverPasswordReset(issued.user.email, issued.token);

    // Always the same answer: whether an account exists is not public information.
    return json({ ok: true });
  });
}

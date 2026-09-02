import { getEnv, isProduction } from '@/lib/env';

/**
 * TaskForge ships without an email provider. Reset links are written to the
 * server log, which is enough for local use and for a self-hosted instance
 * where the operator can read them. Swapping in a real provider means replacing
 * the body of this function.
 */
export async function deliverPasswordReset(email: string, token: string): Promise<void> {
  const link = `${getEnv().APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  if (isProduction()) {
    console.info(`[mail] password reset requested for ${email} — link generated (not printed in production).`);
    console.info('[mail] configure an email provider in src/server/mailer.ts to deliver it.');
    return;
  }
  console.info(`\n[mail] Password reset for ${email}:\n${link}\n`);
}

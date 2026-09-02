import { randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import type { UserRow } from '@/db/schema';
import { passwordResetTokens, users } from '@/db/schema';
import { conflict, badRequest } from './http';
import { burnPasswordTime, hashPassword, verifyPassword } from './password';
import { destroyAllSessionsForUser, hashToken } from './session';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function registerUser(input: {
  email: string;
  password: string;
  displayName: string;
  timezone: string;
}): Promise<UserRow> {
  const existing = await findUserByEmail(input.email);
  if (existing) throw conflict('An account with that email already exists.');

  const passwordHash = await hashPassword(input.password);
  const inserted = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      displayName: input.displayName,
      timezone: input.timezone,
    })
    .returning();

  const user = inserted[0];
  if (!user) throw new Error('User insert returned no row');
  return user;
}

/**
 * Returns null for both "no such account" and "wrong password", and spends the
 * same time hashing either way so the response cannot be used to probe emails.
 */
export async function authenticate(email: string, password: string): Promise<UserRow | null> {
  const user = await findUserByEmail(email);
  if (!user) {
    await burnPasswordTime(password);
    return null;
  }
  const valid = await verifyPassword(password, user.passwordHash);
  return valid ? user : null;
}

export async function updateTimezoneIfChanged(user: UserRow, timezone: string | undefined): Promise<void> {
  if (!timezone || timezone === user.timezone) return;
  await db.update(users).set({ timezone, updatedAt: new Date() }).where(eq(users.id, user.id));
}

/** Returns the raw token only when the account exists; callers must not leak that. */
export async function createPasswordResetToken(email: string): Promise<{ token: string; user: UserRow } | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const token = randomBytes(32).toString('base64url');
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  return { token, user };
}

export async function resetPasswordWithToken(token: string, password: string): Promise<void> {
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashToken(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const record = rows[0];
  if (!record) throw badRequest('That reset link is invalid or has expired.');

  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, record.userId));
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, record.id));
  });
  // Anyone holding an old session on this account loses it.
  await destroyAllSessionsForUser(record.userId);
}

export function publicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    timezone: user.timezone,
    theme: user.theme,
    soundEnabled: user.soundEnabled,
  };
}

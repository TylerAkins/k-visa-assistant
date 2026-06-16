import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  emailVerificationTokens,
  passwordResetTokens,
  recoveryCodes,
  users,
} from "@/db/schema";
import {
  EMAIL_VERIFICATION_TOKEN_TTL_MS,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "@/lib/auth/constants";
import { generateSecureToken, hashToken } from "@/lib/auth/tokens";

export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user ?? null;
}

export async function createEmailVerificationToken(
  userId: string,
): Promise<string> {
  await db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, userId));

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);

  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return token;
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, userId));

  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return token;
}

export async function markRecoveryCodeUsed(codeId: string): Promise<boolean> {
  const [updated] = await db
    .update(recoveryCodes)
    .set({ used: true })
    .where(and(eq(recoveryCodes.id, codeId), eq(recoveryCodes.used, false)))
    .returning({ id: recoveryCodes.id });

  return Boolean(updated);
}

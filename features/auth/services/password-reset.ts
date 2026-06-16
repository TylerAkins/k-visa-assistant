import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { GENERIC_EMAIL_MESSAGE } from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth/password";
import { deleteUserSessions } from "@/lib/auth/session";
import { hashToken, safeCompare } from "@/lib/auth/tokens";
import { getEmailProvider } from "@/lib/email";
import { env } from "@/lib/env";
import { checkAuthRateLimits } from "@/lib/security/auth-rate-limit";
import {
  formatZodErrors,
  rateLimitError,
} from "@/features/auth/services/action-utils";
import {
  createPasswordResetToken,
  findUserByEmail,
} from "@/features/auth/services/user-repository";
import type { ActionResult } from "@/features/auth/types";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/features/auth/validation/schemas";

export async function requestPasswordResetService(
  input: Record<string, FormDataEntryValue | null>,
  clientIp: string,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: input.email,
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: formatZodErrors(parsed.error) };
  }

  const rateLimit = checkAuthRateLimits("reset", [
    `ip:${clientIp}`,
    `email:${parsed.data.email}`,
  ]);
  if (!rateLimit.allowed) {
    return rateLimitError(rateLimit.retryAfterSeconds);
  }

  const user = await findUserByEmail(parsed.data.email);

  if (user) {
    const token = await createPasswordResetToken(user.id);
    const resetUrl = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;

    await getEmailProvider().send({
      to: user.email,
      subject: "Reset your KVisaAssistant password",
      text: `Reset your password by visiting: ${resetUrl}`,
    });
  }

  return { success: true, error: GENERIC_EMAIL_MESSAGE };
}

export async function resetPasswordService(
  input: Record<string, FormDataEntryValue | null>,
  clientIp: string,
): Promise<ActionResult> {
  const rateLimit = checkAuthRateLimits("reset", [`ip:${clientIp}`]);
  if (!rateLimit.allowed) {
    return rateLimitError(rateLimit.retryAfterSeconds);
  }

  const parsed = resetPasswordSchema.safeParse({
    token: input.token,
    password: input.password,
    confirmPassword: input.confirmPassword,
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: formatZodErrors(parsed.error) };
  }

  const tokenHash = hashToken(parsed.data.token);
  const [tokenRow] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!tokenRow || tokenRow.expiresAt <= new Date()) {
    return { success: false, error: "Invalid or expired reset link." };
  }

  if (!safeCompare(tokenRow.tokenHash, tokenHash)) {
    return { success: false, error: "Invalid or expired reset link." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, tokenRow.userId));
    await tx
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.id, tokenRow.id));
  });

  await deleteUserSessions(tokenRow.userId);

  return {
    success: true,
    error: "Password updated. You can sign in with your new password.",
  };
}

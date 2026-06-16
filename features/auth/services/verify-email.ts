import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { emailVerificationTokens, users } from "@/db/schema";
import {
  EMAIL_DELIVERY_FAILED_MESSAGE,
  VERIFICATION_RESEND_MESSAGE,
} from "@/lib/auth/constants";
import { getAuthSession } from "@/lib/auth/get-auth-session";
import { hashToken, safeCompare } from "@/lib/auth/tokens";
import { getEmailProvider } from "@/lib/email";
import { env } from "@/lib/env";
import { checkAuthRateLimits } from "@/lib/security/auth-rate-limit";
import {
  formatZodErrors,
  rateLimitError,
  unauthorizedResult,
} from "@/features/auth/services/action-utils";
import { createEmailVerificationToken } from "@/features/auth/services/user-repository";
import type { ActionResult } from "@/features/auth/types";
import { verifyEmailSchema } from "@/features/auth/validation/schemas";

export async function verifyEmailService(
  input: Record<string, FormDataEntryValue | null>,
  clientIp: string,
): Promise<ActionResult> {
  const rateLimit = checkAuthRateLimits("verify", [`ip:${clientIp}`]);
  if (!rateLimit.allowed) {
    return rateLimitError(rateLimit.retryAfterSeconds);
  }

  const parsed = verifyEmailSchema.safeParse({
    token: input.token,
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: formatZodErrors(parsed.error) };
  }

  const tokenHash = hashToken(parsed.data.token);
  const [tokenRow] = await db
    .select()
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.tokenHash, tokenHash))
    .limit(1);

  if (!tokenRow) {
    return { success: false, error: "Invalid or expired verification link." };
  }

  const [user] = await db
    .select({ emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.id, tokenRow.userId))
    .limit(1);

  if (user?.emailVerified) {
    await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.id, tokenRow.id));
    return { success: true, error: "Email verified successfully." };
  }

  if (tokenRow.expiresAt <= new Date()) {
    return { success: false, error: "Invalid or expired verification link." };
  }

  if (!safeCompare(tokenRow.tokenHash, tokenHash)) {
    return { success: false, error: "Invalid or expired verification link." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, tokenRow.userId));
    await tx
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.id, tokenRow.id));
  });

  return { success: true, error: "Email verified successfully." };
}

export async function resendVerificationEmailService(
  clientIp: string,
): Promise<ActionResult> {
  const authSession = await getAuthSession();
  if (!authSession) {
    return unauthorizedResult();
  }

  if (authSession.user.emailVerified) {
    return { success: false, error: "Your email is already verified." };
  }

  const rateLimit = checkAuthRateLimits("resend", [
    `ip:${clientIp}`,
    `user:${authSession.user.id}`,
  ]);
  if (!rateLimit.allowed) {
    return rateLimitError(rateLimit.retryAfterSeconds);
  }

  const token = await createEmailVerificationToken(authSession.user.id);
  const verifyUrl = `${env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;

  try {
    await getEmailProvider().send({
      to: authSession.user.email,
      subject: "Verify your KVisaAssistant email",
      text: `Verify your email by visiting: ${verifyUrl}`,
    });
  } catch {
    return { success: false, error: EMAIL_DELIVERY_FAILED_MESSAGE };
  }

  return { success: true, error: VERIFICATION_RESEND_MESSAGE };
}

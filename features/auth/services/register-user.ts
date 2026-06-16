import "server-only";

import { eq } from "drizzle-orm";

import { users } from "@/db/schema";
import {
  EMAIL_DELIVERY_FAILED_MESSAGE,
  REGISTRATION_ACCOUNT_EXISTS_MESSAGE,
  REGISTRATION_EMAIL_MESSAGE,
} from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth/password";
import { getEmailProvider } from "@/lib/email";
import { env } from "@/lib/env";
import { db } from "@/db";
import { checkAuthRateLimits } from "@/lib/security/auth-rate-limit";
import {
  formatZodErrors,
  rateLimitError,
} from "@/features/auth/services/action-utils";
import {
  createEmailVerificationToken,
  findUserByEmail,
} from "@/features/auth/services/user-repository";
import type { ActionResult } from "@/features/auth/types";
import { registerSchema } from "@/features/auth/validation/schemas";

async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<void> {
  const verifyUrl = `${env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  await getEmailProvider().send({
    to: email,
    subject: "Verify your KVisaAssistant email",
    text: `Verify your email by visiting: ${verifyUrl}`,
  });
}

export async function registerUserService(
  input: Record<string, FormDataEntryValue | null>,
  clientIp: string,
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    email: input.email,
    password: input.password,
    confirmPassword: input.confirmPassword,
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: formatZodErrors(parsed.error) };
  }

  const rateLimit = checkAuthRateLimits("signup", [`ip:${clientIp}`]);
  if (!rateLimit.allowed) {
    return rateLimitError(rateLimit.retryAfterSeconds);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const existingUser = await findUserByEmail(parsed.data.email);

  if (existingUser?.emailVerified) {
    await hashPassword(parsed.data.password);
    return {
      success: true,
      error: REGISTRATION_ACCOUNT_EXISTS_MESSAGE,
      verificationEmailSent: false,
    };
  }

  if (existingUser && !existingUser.emailVerified) {
    try {
      const token = await createEmailVerificationToken(existingUser.id);
      await sendVerificationEmail(existingUser.email, token);
    } catch {
      return { success: false, error: EMAIL_DELIVERY_FAILED_MESSAGE };
    }

    return {
      success: true,
      error: REGISTRATION_EMAIL_MESSAGE,
      verificationEmailSent: true,
    };
  }

  const [user] = await db
    .insert(users)
    .values({
      email: parsed.data.email,
      passwordHash,
      emailVerified: false,
    })
    .returning();

  if (!user) {
    return { success: false, error: "Unable to create account." };
  }

  try {
    const token = await createEmailVerificationToken(user.id);
    await sendVerificationEmail(user.email, token);
  } catch {
    await db.delete(users).where(eq(users.id, user.id));
    return { success: false, error: EMAIL_DELIVERY_FAILED_MESSAGE };
  }

  return {
    success: true,
    error: REGISTRATION_EMAIL_MESSAGE,
    verificationEmailSent: true,
  };
}

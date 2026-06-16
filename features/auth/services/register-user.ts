import "server-only";

import { eq } from "drizzle-orm";

import { users } from "@/db/schema";
import { REGISTRATION_EMAIL_MESSAGE } from "@/lib/auth/constants";
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

export async function registerUserService(
  input: Record<string, FormDataEntryValue | null>,
  clientIp: string,
): Promise<ActionResult> {
  const rateLimit = checkAuthRateLimits("signup", [`ip:${clientIp}`]);
  if (!rateLimit.allowed) {
    return rateLimitError(rateLimit.retryAfterSeconds);
  }

  const parsed = registerSchema.safeParse({
    email: input.email,
    password: input.password,
    confirmPassword: input.confirmPassword,
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: formatZodErrors(parsed.error) };
  }

  const existingUser = await findUserByEmail(parsed.data.email);

  if (!existingUser) {
    const passwordHash = await hashPassword(parsed.data.password);
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

    const token = await createEmailVerificationToken(user.id);
    const verifyUrl = `${env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;

    await getEmailProvider().send({
      to: user.email,
      subject: "Verify your KVisaAssistant email",
      text: `Verify your email by visiting: ${verifyUrl}`,
    });
  }

  return {
    success: true,
    error: REGISTRATION_EMAIL_MESSAGE,
  };
}

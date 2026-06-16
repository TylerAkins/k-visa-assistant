import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { recoveryCodes, totpSettings } from "@/db/schema";
import {
  LOGIN_INVALID_MESSAGE,
  MAX_PENDING_LOGIN_ATTEMPTS,
  TOTP_INVALID_MESSAGE,
} from "@/lib/auth/constants";
import {
  clearPendingLoginCookie,
  getPendingLoginIdFromCookies,
  getSessionIdFromCookies,
  setPendingLoginCookie,
  setSessionCookie,
} from "@/lib/auth/cookies";
import {
  createPendingLogin,
  deletePendingLogin,
  getPendingLogin,
  incrementPendingLoginAttempts,
} from "@/lib/auth/pending-login";
import { verifyLoginPassword } from "@/lib/auth/password";
import { rotateSession } from "@/lib/auth/session";
import {
  decryptTotpSecret,
  verifyRecoveryCode,
  verifyTotpCode,
} from "@/lib/auth/totp";
import { checkAuthRateLimits } from "@/lib/security/auth-rate-limit";
import {
  formatZodErrors,
  rateLimitError,
} from "@/features/auth/services/action-utils";
import {
  findUserByEmail,
  markRecoveryCodeUsed,
} from "@/features/auth/services/user-repository";
import type { LoginResult } from "@/features/auth/types";
import {
  loginSchema,
  recoveryCodeSchema,
  totpCodeSchema,
} from "@/features/auth/validation/schemas";

export async function loginUserService(
  input: Record<string, FormDataEntryValue | null>,
  clientIp: string,
): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: input.email,
    password: input.password,
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: formatZodErrors(parsed.error) };
  }

  const rateLimit = checkAuthRateLimits("login", [
    `ip:${clientIp}`,
    `email:${parsed.data.email}`,
  ]);
  if (!rateLimit.allowed) {
    return rateLimitError(rateLimit.retryAfterSeconds);
  }

  const user = await findUserByEmail(parsed.data.email);
  const passwordValid = await verifyLoginPassword(
    user ? { passwordHash: user.passwordHash } : null,
    parsed.data.password,
  );

  if (!user || !passwordValid) {
    return { success: false, error: LOGIN_INVALID_MESSAGE };
  }

  const [totp] = await db
    .select()
    .from(totpSettings)
    .where(eq(totpSettings.userId, user.id))
    .limit(1);

  if (totp?.enabled) {
    const pending = await createPendingLogin(user.id);
    await setPendingLoginCookie(pending.id);
    return { success: true, requiresTotp: true };
  }

  const currentSessionId = await getSessionIdFromCookies();
  const session = await rotateSession(currentSessionId, user.id);
  await setSessionCookie(session.id);
  return { success: true, redirectTo: "/account/settings" };
}

export async function verifyLoginTotpService(
  input: Record<string, FormDataEntryValue | null>,
  clientIp: string,
): Promise<LoginResult> {
  const pendingLoginId = await getPendingLoginIdFromCookies();

  if (!pendingLoginId) {
    return { success: false, error: LOGIN_INVALID_MESSAGE };
  }

  const pending = await getPendingLogin(pendingLoginId);
  if (!pending) {
    await clearPendingLoginCookie();
    return { success: false, error: LOGIN_INVALID_MESSAGE };
  }

  const rateLimit = checkAuthRateLimits("totp", [
    `pending:${pendingLoginId}`,
    `ip:${clientIp}`,
    `user:${pending.userId}`,
  ]);
  if (!rateLimit.allowed) {
    return rateLimitError(rateLimit.retryAfterSeconds);
  }

  const totpInput = input.code;
  const recoveryInput = input.recoveryCode;

  let codeValid = false;

  if (typeof recoveryInput === "string" && recoveryInput.length > 0) {
    const parsedRecovery = recoveryCodeSchema.safeParse({
      code: recoveryInput,
    });
    if (!parsedRecovery.success) {
      const attempts = await incrementPendingLoginAttempts(pendingLoginId);
      if (attempts >= MAX_PENDING_LOGIN_ATTEMPTS) {
        await deletePendingLogin(pendingLoginId);
        await clearPendingLoginCookie();
      }
      return { success: false, error: TOTP_INVALID_MESSAGE };
    }

    const codes = await db
      .select()
      .from(recoveryCodes)
      .where(eq(recoveryCodes.userId, pending.userId));

    for (const entry of codes) {
      if (entry.used) {
        continue;
      }

      if (
        await verifyRecoveryCode(entry.codeHash, parsedRecovery.data.code)
      ) {
        const marked = await markRecoveryCodeUsed(entry.id);
        if (marked) {
          codeValid = true;
          break;
        }
      }
    }
  } else {
    const parsedTotp = totpCodeSchema.safeParse({ code: totpInput });
    if (!parsedTotp.success) {
      const attempts = await incrementPendingLoginAttempts(pendingLoginId);
      if (attempts >= MAX_PENDING_LOGIN_ATTEMPTS) {
        await deletePendingLogin(pendingLoginId);
        await clearPendingLoginCookie();
      }
      return { success: false, fieldErrors: formatZodErrors(parsedTotp.error) };
    }

    const [totp] = await db
      .select()
      .from(totpSettings)
      .where(eq(totpSettings.userId, pending.userId))
      .limit(1);

    if (totp?.enabled) {
      const secret = decryptTotpSecret(totp.secretEncrypted);
      codeValid = await verifyTotpCode(secret, parsedTotp.data.code);
    }
  }

  if (!codeValid) {
    const attempts = await incrementPendingLoginAttempts(pendingLoginId);

    if (attempts >= MAX_PENDING_LOGIN_ATTEMPTS) {
      await deletePendingLogin(pendingLoginId);
      await clearPendingLoginCookie();
    }

    return { success: false, error: TOTP_INVALID_MESSAGE };
  }

  await deletePendingLogin(pendingLoginId);
  await clearPendingLoginCookie();

  const currentSessionId = await getSessionIdFromCookies();
  const session = await rotateSession(currentSessionId, pending.userId);
  await setSessionCookie(session.id);
  return { success: true, redirectTo: "/account/settings" };
}

export async function getLoginStateService(): Promise<LoginResult> {
  const pendingLoginId = await getPendingLoginIdFromCookies();
  if (!pendingLoginId) {
    return { success: false };
  }

  const pending = await getPendingLogin(pendingLoginId);
  if (!pending) {
    await clearPendingLoginCookie();
    return { success: false };
  }

  return { success: true, requiresTotp: true };
}

import "server-only";

import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { generateURI } from "otplib";

import { db } from "@/db";
import { recoveryCodes, totpSettings, users } from "@/db/schema";
import { getAuthSession } from "@/lib/auth/get-auth-session";
import { verifyLoginPassword } from "@/lib/auth/password";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  verifyRecoveryCode,
  verifyTotpCode,
} from "@/lib/auth/totp";
import { checkAuthRateLimits } from "@/lib/security/auth-rate-limit";
import {
  formatZodErrors,
  rateLimitError,
  unauthorizedResult,
} from "@/features/auth/services/action-utils";
import { markRecoveryCodeUsed } from "@/features/auth/services/user-repository";
import type { ActionResult, TotpSetupResult } from "@/features/auth/types";
import {
  beginTotpSetupSchema,
  disableTotpSchema,
  recoveryCodeSchema,
  regenerateRecoveryCodesSchema,
  totpCodeSchema,
} from "@/features/auth/validation/schemas";

export async function beginTotpSetupService(
  input: Record<string, FormDataEntryValue | null>,
  clientIp: string,
): Promise<TotpSetupResult> {
  const authSession = await getAuthSession();
  if (!authSession) {
    return unauthorizedResult();
  }

  const parsed = beginTotpSetupSchema.safeParse({
    password: input.password,
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: formatZodErrors(parsed.error) };
  }

  const rateLimit = checkAuthRateLimits("totp-setup", [
    `ip:${clientIp}`,
    `user:${authSession.user.id}`,
  ]);
  if (!rateLimit.allowed) {
    return rateLimitError(rateLimit.retryAfterSeconds);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, authSession.user.id))
    .limit(1);

  if (!user) {
    return unauthorizedResult();
  }

  const passwordValid = await verifyLoginPassword(
    { passwordHash: user.passwordHash },
    parsed.data.password,
  );

  if (!passwordValid) {
    return { success: false, error: "Invalid email or password." };
  }

  const [existing] = await db
    .select()
    .from(totpSettings)
    .where(eq(totpSettings.userId, authSession.user.id))
    .limit(1);

  if (existing?.enabled) {
    return {
      success: false,
      error: "Two-factor authentication is already enabled.",
    };
  }

  const secret = generateTotpSecret();
  const secretEncrypted = encryptTotpSecret(secret);

  if (existing) {
    await db
      .update(totpSettings)
      .set({ secretEncrypted, enabled: false })
      .where(eq(totpSettings.id, existing.id));
  } else {
    await db.insert(totpSettings).values({
      userId: authSession.user.id,
      secretEncrypted,
      enabled: false,
    });
  }

  const uri = generateURI({
    issuer: "KVisaAssistant",
    label: authSession.user.email,
    secret,
  });
  const qrDataUrl = await QRCode.toDataURL(uri);

  return { success: true, qrDataUrl };
}

export async function confirmTotpSetupService(
  input: Record<string, FormDataEntryValue | null>,
  clientIp: string,
): Promise<TotpSetupResult> {
  const authSession = await getAuthSession();
  if (!authSession) {
    return unauthorizedResult();
  }

  const rateLimit = checkAuthRateLimits("totp-setup", [
    `ip:${clientIp}`,
    `user:${authSession.user.id}`,
  ]);
  if (!rateLimit.allowed) {
    return rateLimitError(rateLimit.retryAfterSeconds);
  }

  const parsed = totpCodeSchema.safeParse({ code: input.code });
  if (!parsed.success) {
    return { success: false, fieldErrors: formatZodErrors(parsed.error) };
  }

  const [totp] = await db
    .select()
    .from(totpSettings)
    .where(eq(totpSettings.userId, authSession.user.id))
    .limit(1);

  if (!totp) {
    return { success: false, error: "Start setup before confirming." };
  }

  const secret = decryptTotpSecret(totp.secretEncrypted);
  const valid = await verifyTotpCode(secret, parsed.data.code);

  if (!valid) {
    return { success: false, error: "Invalid code." };
  }

  const plaintextCodes = generateRecoveryCodes();
  const hashedCodes = await Promise.all(
    plaintextCodes.map(async (code) => ({
      userId: authSession.user.id,
      codeHash: await hashRecoveryCode(code),
    })),
  );

  await db.transaction(async (tx) => {
    await tx
      .update(totpSettings)
      .set({ enabled: true })
      .where(eq(totpSettings.id, totp.id));
    await tx
      .delete(recoveryCodes)
      .where(eq(recoveryCodes.userId, authSession.user.id));
    await tx.insert(recoveryCodes).values(hashedCodes);
  });

  return { success: true, recoveryCodes: plaintextCodes };
}

export async function disableTotpService(
  input: Record<string, FormDataEntryValue | null>,
  clientIp: string,
): Promise<ActionResult> {
  const authSession = await getAuthSession();
  if (!authSession) {
    return unauthorizedResult();
  }

  const rateLimit = checkAuthRateLimits("totp-disable", [
    `ip:${clientIp}`,
    `user:${authSession.user.id}`,
  ]);
  if (!rateLimit.allowed) {
    return rateLimitError(rateLimit.retryAfterSeconds);
  }

  const parsed = disableTotpSchema.safeParse({
    password: input.password,
    code: input.code,
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: formatZodErrors(parsed.error) };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, authSession.user.id))
    .limit(1);

  if (!user) {
    return unauthorizedResult();
  }

  const passwordValid = await verifyLoginPassword(
    { passwordHash: user.passwordHash },
    parsed.data.password,
  );

  if (!passwordValid) {
    return { success: false, error: "Invalid email or password." };
  }

  const [totp] = await db
    .select()
    .from(totpSettings)
    .where(eq(totpSettings.userId, authSession.user.id))
    .limit(1);

  if (!totp?.enabled) {
    return {
      success: false,
      error: "Two-factor authentication is not enabled.",
    };
  }

  let codeValid = false;

  if (/^\d{6}$/.test(parsed.data.code)) {
    const secret = decryptTotpSecret(totp.secretEncrypted);
    codeValid = await verifyTotpCode(secret, parsed.data.code);
  } else {
    const parsedRecovery = recoveryCodeSchema.safeParse({
      code: parsed.data.code,
    });

    if (!parsedRecovery.success) {
      return { success: false, error: "Invalid code." };
    }

    const codes = await db
      .select()
      .from(recoveryCodes)
      .where(eq(recoveryCodes.userId, authSession.user.id));

    for (const entry of codes) {
      if (entry.used) {
        continue;
      }

      if (
        await verifyRecoveryCode(entry.codeHash, parsedRecovery.data.code)
      ) {
        codeValid = await markRecoveryCodeUsed(entry.id);
        break;
      }
    }
  }

  if (!codeValid) {
    return { success: false, error: "Invalid code." };
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(totpSettings)
      .where(eq(totpSettings.userId, authSession.user.id));
    await tx
      .delete(recoveryCodes)
      .where(eq(recoveryCodes.userId, authSession.user.id));
  });

  return { success: true, error: "Two-factor authentication disabled." };
}

export async function regenerateRecoveryCodesService(
  input: Record<string, FormDataEntryValue | null>,
  clientIp: string,
): Promise<TotpSetupResult> {
  const authSession = await getAuthSession();
  if (!authSession) {
    return unauthorizedResult();
  }

  const rateLimit = checkAuthRateLimits("recovery-regen", [
    `ip:${clientIp}`,
    `user:${authSession.user.id}`,
  ]);
  if (!rateLimit.allowed) {
    return rateLimitError(rateLimit.retryAfterSeconds);
  }

  const parsed = regenerateRecoveryCodesSchema.safeParse({
    code: input.code,
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: formatZodErrors(parsed.error) };
  }

  const [totp] = await db
    .select()
    .from(totpSettings)
    .where(eq(totpSettings.userId, authSession.user.id))
    .limit(1);

  if (!totp?.enabled) {
    return {
      success: false,
      error: "Two-factor authentication is not enabled.",
    };
  }

  const secret = decryptTotpSecret(totp.secretEncrypted);
  const valid = await verifyTotpCode(secret, parsed.data.code);

  if (!valid) {
    return { success: false, error: "Invalid code." };
  }

  const plaintextCodes = generateRecoveryCodes();
  const hashedCodes = await Promise.all(
    plaintextCodes.map(async (code) => ({
      userId: authSession.user.id,
      codeHash: await hashRecoveryCode(code),
    })),
  );

  await db.transaction(async (tx) => {
    await tx
      .delete(recoveryCodes)
      .where(eq(recoveryCodes.userId, authSession.user.id));
    await tx.insert(recoveryCodes).values(hashedCodes);
  });

  return { success: true, recoveryCodes: plaintextCodes };
}

export async function getTotpStatusService(): Promise<{ enabled: boolean }> {
  const authSession = await getAuthSession();
  if (!authSession) {
    return { enabled: false };
  }

  const [totp] = await db
    .select()
    .from(totpSettings)
    .where(eq(totpSettings.userId, authSession.user.id))
    .limit(1);

  return { enabled: Boolean(totp?.enabled) };
}

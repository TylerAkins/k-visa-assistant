"use server";

import { clearAuthCookies } from "@/lib/auth/cookies";
import { getAuthClientIp } from "@/lib/security/auth-client-ip";
import {
  requestPasswordResetService,
  resetPasswordService,
} from "@/features/auth/services/password-reset";
import type { ActionResult } from "@/features/auth/types";

function formDataToRecord(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function requestPasswordReset(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const clientIp = await getAuthClientIp();
  return requestPasswordResetService(formDataToRecord(formData), clientIp);
}

export async function resetPassword(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const clientIp = await getAuthClientIp();
  const result = await resetPasswordService(formDataToRecord(formData), clientIp);

  if (result.success) {
    await clearAuthCookies();
  }

  return result;
}

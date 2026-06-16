"use server";

import { getRequestClientIp } from "@/lib/security/client-ip";
import {
  resendVerificationEmailService,
  verifyEmailService,
} from "@/features/auth/services/verify-email";
import type { ActionResult } from "@/features/auth/types";

function formDataToRecord(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function verifyEmail(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const clientIp = await getRequestClientIp({ trustProxy: false });
  return verifyEmailService(formDataToRecord(formData), clientIp);
}

export async function resendVerificationEmail(): Promise<ActionResult> {
  const clientIp = await getRequestClientIp({ trustProxy: false });
  return resendVerificationEmailService(clientIp);
}

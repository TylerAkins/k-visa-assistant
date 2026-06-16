"use server";

import { getAuthClientIp } from "@/lib/security/auth-client-ip";
import {
  beginTotpSetupService,
  confirmTotpSetupService,
  disableTotpService,
  getTotpStatusService,
  regenerateRecoveryCodesService,
} from "@/features/auth/services/totp";
import type { ActionResult, TotpSetupResult } from "@/features/auth/types";

function formDataToRecord(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function beginTotpSetup(): Promise<TotpSetupResult> {
  const clientIp = await getAuthClientIp();
  return beginTotpSetupService(clientIp);
}

export async function confirmTotpSetup(
  _prevState: TotpSetupResult,
  formData: FormData,
): Promise<TotpSetupResult> {
  const clientIp = await getAuthClientIp();
  return confirmTotpSetupService(formDataToRecord(formData), clientIp);
}

export async function disableTotp(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const clientIp = await getAuthClientIp();
  return disableTotpService(formDataToRecord(formData), clientIp);
}

export async function regenerateRecoveryCodes(
  _prevState: TotpSetupResult,
  formData: FormData,
): Promise<TotpSetupResult> {
  const clientIp = await getAuthClientIp();
  return regenerateRecoveryCodesService(formDataToRecord(formData), clientIp);
}

export async function getTotpStatus(): Promise<{ enabled: boolean }> {
  return getTotpStatusService();
}

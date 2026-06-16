"use server";

import { redirect } from "next/navigation";

import { getAuthClientIp } from "@/lib/security/auth-client-ip";
import {
  getLoginStateService,
  loginUserService,
  verifyLoginTotpService,
} from "@/features/auth/services/login";
import type { LoginResult } from "@/features/auth/types";

function formDataToRecord(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function loginUser(
  _prevState: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  const clientIp = await getAuthClientIp();
  const result = await loginUserService(formDataToRecord(formData), clientIp);

  if (result.success && result.redirectTo) {
    redirect(result.redirectTo);
  }

  return result;
}

export async function verifyLoginTotp(
  _prevState: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  const clientIp = await getAuthClientIp();
  const result = await verifyLoginTotpService(
    formDataToRecord(formData),
    clientIp,
  );

  if (result.success && result.redirectTo) {
    redirect(result.redirectTo);
  }

  return result;
}

export async function getLoginState(): Promise<LoginResult> {
  return getLoginStateService();
}

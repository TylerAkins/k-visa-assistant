"use server";

import { getAuthClientIp } from "@/lib/security/auth-client-ip";
import { registerUserService } from "@/features/auth/services/register-user";
import type { ActionResult } from "@/features/auth/types";

export async function registerUser(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const clientIp = await getAuthClientIp();

  return registerUserService(
    {
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    },
    clientIp,
  );
}

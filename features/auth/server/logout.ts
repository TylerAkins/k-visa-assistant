"use server";

import { getRequestClientIp } from "@/lib/security/client-ip";
import { logoutUserService } from "@/features/auth/services/logout";
import type { ActionResult } from "@/features/auth/types";

export async function logoutUser(): Promise<ActionResult> {
  return logoutUserService();
}

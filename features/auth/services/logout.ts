import "server-only";

import { getAuthSession } from "@/lib/auth/get-auth-session";
import {
  clearPendingLoginCookie,
  clearSessionCookie,
  getSessionIdFromCookies,
} from "@/lib/auth/cookies";
import { deleteSession } from "@/lib/auth/session";
import { unauthorizedResult } from "@/features/auth/services/action-utils";
import type { ActionResult } from "@/features/auth/types";

export async function logoutUserService(): Promise<ActionResult> {
  const authSession = await getAuthSession();
  if (!authSession) {
    return unauthorizedResult();
  }

  const sessionId = await getSessionIdFromCookies();
  if (sessionId) {
    await deleteSession(sessionId);
  }

  await clearSessionCookie();
  await clearPendingLoginCookie();

  return { success: true };
}

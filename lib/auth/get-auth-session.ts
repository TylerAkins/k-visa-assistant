import "server-only";

import { getSessionIdFromCookies } from "@/lib/auth/cookies";
import { getSession, type SessionResult } from "@/lib/auth/session";

export async function getAuthSession(): Promise<SessionResult | null> {
  const sessionId = await getSessionIdFromCookies();
  if (!sessionId) {
    return null;
  }

  return getSession(sessionId);
}

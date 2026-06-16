import "server-only";

import {
  clearAuthCookies,
  getSessionIdFromCookies,
  hasRawSessionCookieValue,
} from "@/lib/auth/cookies";
import { getSession, type SessionResult } from "@/lib/auth/session";

export async function getAuthSession(): Promise<SessionResult | null> {
  const hasRawCookie = await hasRawSessionCookieValue();
  const sessionId = await getSessionIdFromCookies();

  if (!sessionId) {
    if (hasRawCookie) {
      await clearAuthCookies();
    }
    return null;
  }

  const session = await getSession(sessionId);
  if (!session) {
    await clearAuthCookies();
    return null;
  }

  return session;
}

import "server-only";

import { cookies } from "next/headers";

import {
  buildAuthCookieOptions,
  getPendingLoginCookieMaxAge,
  getPendingLoginCookieName,
  getSessionCookieMaxAge,
  getSessionCookieName,
} from "@/lib/auth/cookie-config";
import {
  parseSessionCookieValue,
  signSessionCookieValue,
} from "@/lib/auth/session-cookie";
import { env } from "@/lib/env";

export async function setSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies();
  const signedValue = await signSessionCookieValue(
    sessionId,
    env.SESSION_SECRET,
  );
  cookieStore.set(
    getSessionCookieName(env.APP_ENV),
    signedValue,
    buildAuthCookieOptions(env.APP_ENV, getSessionCookieMaxAge()),
  );
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(getSessionCookieName(env.APP_ENV));
}

export async function getSessionIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const local = cookieStore.get("session")?.value;
  const host = cookieStore.get("__Host-session")?.value;
  const rawValue = local ?? host ?? null;

  if (!rawValue) {
    return null;
  }

  return parseSessionCookieValue(rawValue, env.SESSION_SECRET);
}

export async function setPendingLoginCookie(
  pendingLoginId: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    getPendingLoginCookieName(env.APP_ENV),
    pendingLoginId,
    buildAuthCookieOptions(env.APP_ENV, getPendingLoginCookieMaxAge()),
  );
}

export async function clearPendingLoginCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(getPendingLoginCookieName(env.APP_ENV));
}

export async function getPendingLoginIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const local = cookieStore.get("pending-login")?.value;
  const host = cookieStore.get("__Host-pending-login")?.value;
  return local ?? host ?? null;
}

export function getSessionCookieNameForMiddleware(): string[] {
  return ["session", "__Host-session"];
}

import "server-only";

import { cookies } from "next/headers";

import {
  PENDING_LOGIN_COOKIE_NAME_HOST,
  PENDING_LOGIN_COOKIE_NAME_LOCAL,
  SESSION_COOKIE_NAME_HOST,
  SESSION_COOKIE_NAME_LOCAL,
} from "@/lib/auth/constants";
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
  cookieStore.delete(SESSION_COOKIE_NAME_LOCAL);
  cookieStore.delete(SESSION_COOKIE_NAME_HOST);
}

export async function getSessionIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const local = cookieStore.get(SESSION_COOKIE_NAME_LOCAL)?.value;
  const host = cookieStore.get(SESSION_COOKIE_NAME_HOST)?.value;
  const rawValue = local ?? host ?? null;

  if (!rawValue) {
    return null;
  }

  return parseSessionCookieValue(rawValue, env.SESSION_SECRET);
}

export async function hasRawSessionCookieValue(): Promise<boolean> {
  const cookieStore = await cookies();
  return Boolean(
    cookieStore.get(SESSION_COOKIE_NAME_LOCAL)?.value ??
      cookieStore.get(SESSION_COOKIE_NAME_HOST)?.value,
  );
}

export async function setPendingLoginCookie(
  pendingLoginId: string,
): Promise<void> {
  const cookieStore = await cookies();
  const signedValue = await signSessionCookieValue(
    pendingLoginId,
    env.SESSION_SECRET,
  );
  cookieStore.set(
    getPendingLoginCookieName(env.APP_ENV),
    signedValue,
    buildAuthCookieOptions(env.APP_ENV, getPendingLoginCookieMaxAge()),
  );
}

export async function clearPendingLoginCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_LOGIN_COOKIE_NAME_LOCAL);
  cookieStore.delete(PENDING_LOGIN_COOKIE_NAME_HOST);
}

export async function getPendingLoginIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const local = cookieStore.get(PENDING_LOGIN_COOKIE_NAME_LOCAL)?.value;
  const host = cookieStore.get(PENDING_LOGIN_COOKIE_NAME_HOST)?.value;
  const rawValue = local ?? host ?? null;

  if (!rawValue) {
    return null;
  }

  return parseSessionCookieValue(rawValue, env.SESSION_SECRET);
}

export async function clearAuthCookies(): Promise<void> {
  await clearSessionCookie();
  await clearPendingLoginCookie();
}

export function getSessionCookieNameForMiddleware(): string[] {
  return [SESSION_COOKIE_NAME_LOCAL, SESSION_COOKIE_NAME_HOST];
}

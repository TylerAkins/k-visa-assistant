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
  getAlternatePendingLoginCookieName,
  getAlternateSessionCookieName,
  getPendingLoginCookieMaxAge,
  getPendingLoginCookieName,
  getPendingLoginCookieReadOrder,
  getSessionCookieMaxAge,
  getSessionCookieName,
  getSessionCookieReadOrder,
} from "@/lib/auth/cookie-config";
import {
  parseSessionCookieValue,
  signSessionCookieValue,
} from "@/lib/auth/session-cookie";
import { env } from "@/lib/env";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function readCookieValue(
  cookieStore: CookieStore,
  names: [string, string],
): string | null {
  for (const name of names) {
    const value = cookieStore.get(name)?.value;
    if (value) {
      return value;
    }
  }

  return null;
}

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
  cookieStore.delete(getAlternateSessionCookieName(env.APP_ENV));
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME_LOCAL);
  cookieStore.delete(SESSION_COOKIE_NAME_HOST);
}

export async function getSessionIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const rawValue = readCookieValue(
    cookieStore,
    getSessionCookieReadOrder(env.APP_ENV),
  );

  if (!rawValue) {
    return null;
  }

  return parseSessionCookieValue(rawValue, env.SESSION_SECRET);
}

export async function hasRawSessionCookieValue(): Promise<boolean> {
  const cookieStore = await cookies();
  return Boolean(
    readCookieValue(cookieStore, getSessionCookieReadOrder(env.APP_ENV)),
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
  cookieStore.delete(getAlternatePendingLoginCookieName(env.APP_ENV));
}

export async function clearPendingLoginCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_LOGIN_COOKIE_NAME_LOCAL);
  cookieStore.delete(PENDING_LOGIN_COOKIE_NAME_HOST);
}

export async function getPendingLoginIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const rawValue = readCookieValue(
    cookieStore,
    getPendingLoginCookieReadOrder(env.APP_ENV),
  );

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

import type { AppEnvironment } from "@/lib/env-schema";
import { isLocalEnv } from "@/lib/env-schema";
import {
  PENDING_LOGIN_COOKIE_NAME_HOST,
  PENDING_LOGIN_COOKIE_NAME_LOCAL,
  PENDING_LOGIN_TTL_MS,
  SESSION_COOKIE_NAME_HOST,
  SESSION_COOKIE_NAME_LOCAL,
  SESSION_TTL_MS,
} from "@/lib/auth/constants";

export function getSessionCookieName(appEnv: AppEnvironment): string {
  return isLocalEnv(appEnv) ? SESSION_COOKIE_NAME_LOCAL : SESSION_COOKIE_NAME_HOST;
}

export function getPendingLoginCookieName(appEnv: AppEnvironment): string {
  return isLocalEnv(appEnv)
    ? PENDING_LOGIN_COOKIE_NAME_LOCAL
    : PENDING_LOGIN_COOKIE_NAME_HOST;
}

export function getSessionCookieReadOrder(
  appEnv: AppEnvironment,
): [string, string] {
  if (isLocalEnv(appEnv)) {
    return [SESSION_COOKIE_NAME_LOCAL, SESSION_COOKIE_NAME_HOST];
  }

  return [SESSION_COOKIE_NAME_HOST, SESSION_COOKIE_NAME_LOCAL];
}

export function getPendingLoginCookieReadOrder(
  appEnv: AppEnvironment,
): [string, string] {
  if (isLocalEnv(appEnv)) {
    return [PENDING_LOGIN_COOKIE_NAME_LOCAL, PENDING_LOGIN_COOKIE_NAME_HOST];
  }

  return [PENDING_LOGIN_COOKIE_NAME_HOST, PENDING_LOGIN_COOKIE_NAME_LOCAL];
}

export function getAlternateSessionCookieName(
  appEnv: AppEnvironment,
): string {
  return isLocalEnv(appEnv)
    ? SESSION_COOKIE_NAME_HOST
    : SESSION_COOKIE_NAME_LOCAL;
}

export function getAlternatePendingLoginCookieName(
  appEnv: AppEnvironment,
): string {
  return isLocalEnv(appEnv)
    ? PENDING_LOGIN_COOKIE_NAME_HOST
    : PENDING_LOGIN_COOKIE_NAME_LOCAL;
}

export function buildAuthCookieOptions(appEnv: AppEnvironment, maxAgeMs: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: !isLocalEnv(appEnv),
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

export function getSessionCookieMaxAge(): number {
  return SESSION_TTL_MS;
}

export function getPendingLoginCookieMaxAge(): number {
  return PENDING_LOGIN_TTL_MS;
}

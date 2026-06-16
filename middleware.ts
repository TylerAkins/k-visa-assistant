import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  PENDING_LOGIN_COOKIE_NAME_HOST,
  PENDING_LOGIN_COOKIE_NAME_LOCAL,
  SESSION_COOKIE_NAME_HOST,
  SESSION_COOKIE_NAME_LOCAL,
} from "@/lib/auth/constants";
import {
  getPendingLoginCookieReadOrder,
  getSessionCookieReadOrder,
} from "@/lib/auth/cookie-config";
import type { AppEnvironment } from "@/lib/env-schema";
import { parseSessionCookieValue } from "@/lib/auth/session-cookie";

const guestPaths = ["/login", "/register", "/forgot-password"];
const sensitiveTokenPaths = ["/verify-email", "/reset-password"];

function getAppEnvironment(): AppEnvironment {
  const appEnv = process.env.APP_ENV;
  if (appEnv === "dev" || appEnv === "prod") {
    return appEnv;
  }

  return "local";
}

function readRequestCookie(
  request: NextRequest,
  names: [string, string],
): string | null {
  for (const name of names) {
    const value = request.cookies.get(name)?.value;
    if (value) {
      return value;
    }
  }

  return null;
}

function getSessionCookieValue(request: NextRequest): string | null {
  return readRequestCookie(
    request,
    getSessionCookieReadOrder(getAppEnvironment()),
  );
}

function getPendingLoginCookieValue(request: NextRequest): string | null {
  return readRequestCookie(
    request,
    getPendingLoginCookieReadOrder(getAppEnvironment()),
  );
}

function clearSessionCookies(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE_NAME_LOCAL);
  response.cookies.delete(SESSION_COOKIE_NAME_HOST);
}

function clearPendingLoginCookies(response: NextResponse): void {
  response.cookies.delete(PENDING_LOGIN_COOKIE_NAME_LOCAL);
  response.cookies.delete(PENDING_LOGIN_COOKIE_NAME_HOST);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionSecret = process.env.SESSION_SECRET;
  const rawSessionCookie = getSessionCookieValue(request);
  const rawPendingLoginCookie = getPendingLoginCookieValue(request);
  let sessionPresent = false;

  if (rawSessionCookie && sessionSecret) {
    sessionPresent = Boolean(
      await parseSessionCookieValue(rawSessionCookie, sessionSecret),
    );
  }

  if (pathname.startsWith("/account") && !sessionPresent) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (guestPaths.includes(pathname)) {
    const response = NextResponse.next();

    if (rawSessionCookie && !sessionPresent) {
      clearSessionCookies(response);
    }

    if (rawPendingLoginCookie && sessionSecret) {
      const pendingPresent = Boolean(
        await parseSessionCookieValue(rawPendingLoginCookie, sessionSecret),
      );
      if (!pendingPresent) {
        clearPendingLoginCookies(response);
      }
    }

    return response;
  }

  if (sensitiveTokenPaths.includes(pathname)) {
    const response = NextResponse.next();
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/verify-email",
    "/reset-password",
  ],
};

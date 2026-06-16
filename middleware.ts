import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  PENDING_LOGIN_COOKIE_NAME_HOST,
  PENDING_LOGIN_COOKIE_NAME_LOCAL,
  SESSION_COOKIE_NAME_HOST,
  SESSION_COOKIE_NAME_LOCAL,
} from "@/lib/auth/constants";
import { parseSessionCookieValue } from "@/lib/auth/session-cookie";

const guestPaths = ["/login", "/register", "/forgot-password"];
const sensitiveTokenPaths = ["/verify-email", "/reset-password"];

function getSessionCookieValue(request: NextRequest): string | null {
  return (
    request.cookies.get(SESSION_COOKIE_NAME_LOCAL)?.value ??
    request.cookies.get(SESSION_COOKIE_NAME_HOST)?.value ??
    null
  );
}

function getPendingLoginCookieValue(request: NextRequest): string | null {
  return (
    request.cookies.get(PENDING_LOGIN_COOKIE_NAME_LOCAL)?.value ??
    request.cookies.get(PENDING_LOGIN_COOKIE_NAME_HOST)?.value ??
    null
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

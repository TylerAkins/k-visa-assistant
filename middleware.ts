import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  SESSION_COOKIE_NAME_HOST,
  SESSION_COOKIE_NAME_LOCAL,
} from "@/lib/auth/constants";
import { parseSessionCookieValue } from "@/lib/auth/session-cookie";

const guestPaths = ["/login", "/register", "/forgot-password"];

function getSessionCookieValue(request: NextRequest): string | null {
  return (
    request.cookies.get(SESSION_COOKIE_NAME_LOCAL)?.value ??
    request.cookies.get(SESSION_COOKIE_NAME_HOST)?.value ??
    null
  );
}

function clearSessionCookies(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE_NAME_LOCAL);
  response.cookies.delete(SESSION_COOKIE_NAME_HOST);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionSecret = process.env.SESSION_SECRET;
  const rawSessionCookie = getSessionCookieValue(request);
  let sessionPresent = false;

  if (rawSessionCookie && sessionSecret) {
    sessionPresent = Boolean(
      await parseSessionCookieValue(rawSessionCookie, sessionSecret),
    );
  }

  if (pathname.startsWith("/account") && !sessionPresent) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (guestPaths.includes(pathname) && rawSessionCookie && !sessionPresent) {
    const response = NextResponse.next();
    clearSessionCookies(response);
    return response;
  }

  if (guestPaths.includes(pathname) && sessionPresent) {
    return NextResponse.redirect(new URL("/account/settings", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/login", "/register", "/forgot-password"],
};

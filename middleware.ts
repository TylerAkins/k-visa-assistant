import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
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

function clearSessionCookies(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE_NAME_LOCAL);
  response.cookies.delete(SESSION_COOKIE_NAME_HOST);
}

function getConnectingIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

function withConnectingIp(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers);
  const connectingIp = getConnectingIp(request);

  if (connectingIp) {
    requestHeaders.set("x-connecting-ip", connectingIp);
  }

  return requestHeaders;
}

function nextWithConnectingIp(request: NextRequest): NextResponse {
  return NextResponse.next({
    request: {
      headers: withConnectingIp(request),
    },
  });
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
    const response = NextResponse.redirect(new URL("/login", request.url));
    const connectingIp = getConnectingIp(request);
    if (connectingIp) {
      response.headers.set("x-connecting-ip", connectingIp);
    }
    return response;
  }

  if (guestPaths.includes(pathname) && rawSessionCookie && !sessionPresent) {
    const response = nextWithConnectingIp(request);
    clearSessionCookies(response);
    return response;
  }

  if (sensitiveTokenPaths.includes(pathname)) {
    const response = nextWithConnectingIp(request);
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  return nextWithConnectingIp(request);
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

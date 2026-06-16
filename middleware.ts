import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  SESSION_COOKIE_NAME_HOST,
  SESSION_COOKIE_NAME_LOCAL,
} from "@/lib/auth/constants";

const guestPaths = ["/login", "/register", "/forgot-password"];

function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has(SESSION_COOKIE_NAME_LOCAL) ||
    request.cookies.has(SESSION_COOKIE_NAME_HOST)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionPresent = hasSessionCookie(request);

  if (pathname.startsWith("/account") && !sessionPresent) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (guestPaths.includes(pathname) && sessionPresent) {
    return NextResponse.redirect(new URL("/account/settings", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account/:path*",
    "/login",
    "/register",
    "/forgot-password",
  ],
};

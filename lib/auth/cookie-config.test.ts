import { describe, expect, it } from "vitest";

import {
  buildAuthCookieOptions,
  getPendingLoginCookieMaxAge,
  getPendingLoginCookieName,
  getSessionCookieMaxAge,
  getSessionCookieName,
} from "@/lib/auth/cookie-config";

describe("cookie-config", () => {
  it("uses local cookie names in local env", () => {
    expect(getSessionCookieName("local")).toBe("session");
    expect(getPendingLoginCookieName("local")).toBe("pending-login");
  });

  it("uses host cookie names in prod env", () => {
    expect(getSessionCookieName("prod")).toBe("__Host-session");
    expect(getPendingLoginCookieName("prod")).toBe("__Host-pending-login");
  });

  it("builds secure cookies for non-local env", () => {
    expect(buildAuthCookieOptions("prod", 60_000)).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60,
    });
  });

  it("exposes cookie max age helpers", () => {
    expect(getSessionCookieMaxAge()).toBeGreaterThan(0);
    expect(getPendingLoginCookieMaxAge()).toBeGreaterThan(0);
  });
});

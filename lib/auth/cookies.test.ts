import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { cookieStore } = vi.hoisted(() => ({
  cookieStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(cookieStore),
}));

vi.mock("@/lib/env", () => ({
  env: { APP_ENV: "local" },
}));

import {
  clearPendingLoginCookie,
  clearSessionCookie,
  getPendingLoginIdFromCookies,
  getSessionCookieNameForMiddleware,
  getSessionIdFromCookies,
  setPendingLoginCookie,
  setSessionCookie,
} from "@/lib/auth/cookies";

describe("cookies", () => {
  it("exposes middleware cookie names", () => {
    expect(getSessionCookieNameForMiddleware()).toContain("session");
  });

  it("reads session and pending ids from cookies", async () => {
    cookieStore.get.mockImplementation((name: string) => {
      if (name === "session") {
        return { value: "session-123" };
      }
      if (name === "pending-login") {
        return { value: "pending-123" };
      }
      return undefined;
    });

    await expect(getSessionIdFromCookies()).resolves.toBe("session-123");
    await expect(getPendingLoginIdFromCookies()).resolves.toBe("pending-123");
  });

  it("sets and clears session cookies", async () => {
    await setSessionCookie("session-456");
    expect(cookieStore.set).toHaveBeenCalledWith(
      "session",
      "session-456",
      expect.objectContaining({ httpOnly: true, secure: false }),
    );

    await clearSessionCookie();
    expect(cookieStore.delete).toHaveBeenCalledWith("session");
  });

  it("sets and clears pending login cookies", async () => {
    await setPendingLoginCookie("pending-456");
    expect(cookieStore.set).toHaveBeenCalledWith(
      "pending-login",
      "pending-456",
      expect.objectContaining({ httpOnly: true }),
    );

    await clearPendingLoginCookie();
    expect(cookieStore.delete).toHaveBeenCalledWith("pending-login");
  });

  it("returns null when cookies are missing", async () => {
    cookieStore.get.mockReturnValue(undefined);
    await expect(getSessionIdFromCookies()).resolves.toBeNull();
    await expect(getPendingLoginIdFromCookies()).resolves.toBeNull();
  });

  it("prefers local session cookie over host cookie", async () => {
    cookieStore.get.mockImplementation((name: string) => {
      if (name === "session") {
        return { value: "local-session" };
      }
      if (name === "__Host-session") {
        return { value: "host-session" };
      }
      return undefined;
    });

    await expect(getSessionIdFromCookies()).resolves.toBe("local-session");
  });

  it("reads host-prefixed session cookies", async () => {
    cookieStore.get.mockImplementation((name: string) => {
      if (name === "__Host-session") {
        return { value: "host-session-123" };
      }
      return undefined;
    });

    await expect(getSessionIdFromCookies()).resolves.toBe("host-session-123");
  });

  it("reads host-prefixed pending login cookies", async () => {
    cookieStore.get.mockImplementation((name: string) => {
      if (name === "__Host-pending-login") {
        return { value: "host-pending-123" };
      }
      return undefined;
    });

    await expect(getPendingLoginIdFromCookies()).resolves.toBe(
      "host-pending-123",
    );
  });

  it("uses host cookie names in prod env", async () => {
    vi.resetModules();
    vi.doMock("@/lib/env", () => ({
      env: { APP_ENV: "prod" },
    }));
    vi.doMock("next/headers", () => ({
      cookies: vi.fn().mockResolvedValue(cookieStore),
    }));

    const { setSessionCookie: setProdSessionCookie } = await import(
      "@/lib/auth/cookies"
    );

    await setProdSessionCookie("session-prod");
    expect(cookieStore.set).toHaveBeenCalledWith(
      "__Host-session",
      "session-prod",
      expect.objectContaining({ secure: true }),
    );
  });
});

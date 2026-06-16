import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/cookies", () => ({
  clearAuthCookies: vi.fn(),
  getSessionIdFromCookies: vi.fn(),
  hasRawSessionCookieValue: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

import {
  clearAuthCookies,
  getSessionIdFromCookies,
  hasRawSessionCookieValue,
} from "@/lib/auth/cookies";
import { getAuthSession } from "@/lib/auth/get-auth-session";
import { getSession } from "@/lib/auth/session";

describe("getAuthSession", () => {
  it("returns null when no cookie is present", async () => {
    vi.mocked(hasRawSessionCookieValue).mockResolvedValue(false);
    vi.mocked(getSessionIdFromCookies).mockResolvedValue(null);
    await expect(getAuthSession()).resolves.toBeNull();
    expect(clearAuthCookies).not.toHaveBeenCalled();
  });

  it("clears stale cookies when signature is invalid", async () => {
    vi.mocked(hasRawSessionCookieValue).mockResolvedValue(true);
    vi.mocked(getSessionIdFromCookies).mockResolvedValue(null);
    await expect(getAuthSession()).resolves.toBeNull();
    expect(clearAuthCookies).toHaveBeenCalled();
  });

  it("clears cookies when session row is missing", async () => {
    vi.mocked(hasRawSessionCookieValue).mockResolvedValue(true);
    vi.mocked(getSessionIdFromCookies).mockResolvedValue("session-1");
    vi.mocked(getSession).mockResolvedValue(null);
    await expect(getAuthSession()).resolves.toBeNull();
    expect(clearAuthCookies).toHaveBeenCalled();
  });

  it("delegates to getSession when cookie exists", async () => {
    const sessionResult = {
      user: { id: "user-1", email: "a@b.com", emailVerified: true },
      session: {
        id: "session-1",
        userId: "user-1",
        expiresAt: new Date(),
      },
    };
    vi.mocked(hasRawSessionCookieValue).mockResolvedValue(true);
    vi.mocked(getSessionIdFromCookies).mockResolvedValue("session-1");
    vi.mocked(getSession).mockResolvedValue(sessionResult);

    await expect(getAuthSession()).resolves.toEqual(sessionResult);
  });
});

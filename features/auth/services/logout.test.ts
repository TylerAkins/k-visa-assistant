import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/get-auth-session", () => ({
  getAuthSession: vi.fn(),
}));

vi.mock("@/lib/auth/cookies", () => ({
  getSessionIdFromCookies: vi.fn(),
  clearSessionCookie: vi.fn(),
  clearPendingLoginCookie: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  deleteSession: vi.fn(),
}));

import { getAuthSession } from "@/lib/auth/get-auth-session";
import { getSessionIdFromCookies } from "@/lib/auth/cookies";
import { logoutUserService } from "@/features/auth/services/logout";

describe("logoutUserService", () => {
  it("requires an authenticated session", async () => {
    vi.mocked(getAuthSession).mockResolvedValue(null);
    const result = await logoutUserService();
    expect(result.success).toBe(false);
  });

  it("logs out authenticated users", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({
      user: { id: "user-1", email: "a@b.com", emailVerified: true },
      session: { id: "session-1", userId: "user-1", expiresAt: new Date() },
    });
    vi.mocked(getSessionIdFromCookies).mockResolvedValue("session-1");

    const result = await logoutUserService();
    expect(result.success).toBe(true);
  });

  it("logs out when session cookie is missing", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({
      user: { id: "user-1", email: "a@b.com", emailVerified: true },
      session: { id: "session-1", userId: "user-1", expiresAt: new Date() },
    });
    vi.mocked(getSessionIdFromCookies).mockResolvedValue(undefined);

    const result = await logoutUserService();
    expect(result.success).toBe(true);
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/get-auth-session", () => ({
  getAuthSession: vi.fn(),
}));

import { getAuthSession } from "@/lib/auth/get-auth-session";
import { getCurrentUserService } from "@/features/auth/services/session";

describe("getCurrentUserService", () => {
  it("returns null without session", async () => {
    vi.mocked(getAuthSession).mockResolvedValue(null);
    await expect(getCurrentUserService()).resolves.toBeNull();
  });

  it("returns user from session", async () => {
    vi.mocked(getAuthSession).mockResolvedValue({
      user: { id: "user-1", email: "a@b.com", emailVerified: true },
      session: { id: "session-1", userId: "user-1", expiresAt: new Date() },
    });

    await expect(getCurrentUserService()).resolves.toEqual({
      id: "user-1",
      email: "a@b.com",
      emailVerified: true,
    });
  });
});

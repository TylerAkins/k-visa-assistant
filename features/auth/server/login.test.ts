import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/features/auth/services/login", () => ({
  loginUserService: vi.fn(),
  verifyLoginTotpService: vi.fn(),
  getLoginStateService: vi.fn(),
}));

import {
  getLoginStateService,
  loginUserService,
} from "@/features/auth/services/login";
import { loginUser } from "@/features/auth/server/login";

describe("loginUser", () => {
  it("delegates to loginUserService", async () => {
    vi.mocked(loginUserService).mockResolvedValue({ success: true });

    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "SecurePass123!");

    const result = await loginUser({ success: false }, formData);
    expect(loginUserService).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it("redirects when service returns redirectTo", async () => {
    vi.mocked(loginUserService).mockResolvedValue({
      success: true,
      redirectTo: "/account/settings",
    });

    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "SecurePass123!");

    await expect(loginUser({ success: false }, formData)).rejects.toThrow(
      "NEXT_REDIRECT",
    );
  });

  it("delegates getLoginState to service", async () => {
    vi.mocked(getLoginStateService).mockResolvedValue({
      success: true,
      requiresTotp: true,
    });

    const result = await import("@/features/auth/server/login").then((m) =>
      m.getLoginState(),
    );
    expect(getLoginStateService).toHaveBeenCalled();
    expect(result.requiresTotp).toBe(true);
  });
});

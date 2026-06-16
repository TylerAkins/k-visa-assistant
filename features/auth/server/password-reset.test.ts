import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth/cookies", () => ({
  clearAuthCookies: vi.fn(),
}));

vi.mock("@/features/auth/services/password-reset", () => ({
  requestPasswordResetService: vi.fn().mockResolvedValue({ success: true }),
  resetPasswordService: vi.fn().mockResolvedValue({ success: true }),
}));

import { clearAuthCookies } from "@/lib/auth/cookies";
import {
  requestPasswordResetService,
  resetPasswordService,
} from "@/features/auth/services/password-reset";
import {
  requestPasswordReset,
  resetPassword,
} from "@/features/auth/server/password-reset";

describe("password reset actions", () => {
  it("delegates requestPasswordReset to service", async () => {
    const formData = new FormData();
    formData.set("email", "user@example.com");

    const result = await requestPasswordReset({ success: false }, formData);
    expect(requestPasswordResetService).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it("clears auth cookies after successful reset", async () => {
    const formData = new FormData();
    formData.set("token", "reset-token");
    formData.set("password", "NewSecurePass123!");
    formData.set("confirmPassword", "NewSecurePass123!");

    const result = await resetPassword({ success: false }, formData);
    expect(resetPasswordService).toHaveBeenCalled();
    expect(clearAuthCookies).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});

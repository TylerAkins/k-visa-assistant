import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/features/auth/services/password-reset", () => ({
  requestPasswordResetService: vi.fn().mockResolvedValue({ success: true }),
  resetPasswordService: vi.fn().mockResolvedValue({ success: true }),
}));

import { requestPasswordResetService } from "@/features/auth/services/password-reset";
import { requestPasswordReset } from "@/features/auth/server/password-reset";

describe("password reset actions", () => {
  it("delegates requestPasswordReset to service", async () => {
    const formData = new FormData();
    formData.set("email", "user@example.com");

    const result = await requestPasswordReset({ success: false }, formData);
    expect(requestPasswordResetService).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/features/auth/services/register-user", () => ({
  registerUserService: vi.fn().mockResolvedValue({ success: true }),
}));

import { registerUserService } from "@/features/auth/services/register-user";
import { registerUser } from "@/features/auth/server/register";

describe("registerUser", () => {
  it("delegates to registerUserService", async () => {
    const formData = new FormData();
    formData.set("email", "new@example.com");

    const result = await registerUser({ success: false }, formData);
    expect(registerUserService).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});

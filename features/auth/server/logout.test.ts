import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/features/auth/services/logout", () => ({
  logoutUserService: vi.fn().mockResolvedValue({ success: true }),
}));

import { logoutUserService } from "@/features/auth/services/logout";
import { logoutUser } from "@/features/auth/server/logout";

describe("logoutUser", () => {
  it("delegates to logoutUserService", async () => {
    const result = await logoutUser();
    expect(logoutUserService).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});

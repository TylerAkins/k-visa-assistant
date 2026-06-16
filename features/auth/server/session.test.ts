import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/features/auth/services/session", () => ({
  getCurrentUserService: vi.fn().mockResolvedValue(null),
}));

import { getCurrentUserService } from "@/features/auth/services/session";
import { getCurrentUser } from "@/features/auth/server/session";

describe("getCurrentUser", () => {
  it("delegates to getCurrentUserService", async () => {
    await getCurrentUser();
    expect(getCurrentUserService).toHaveBeenCalled();
  });
});

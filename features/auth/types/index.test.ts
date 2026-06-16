import { describe, expect, it } from "vitest";

import type { ActionResult, SessionUser } from "@/features/auth/types";

describe("auth types", () => {
  it("allows constructing action results", () => {
    const result: ActionResult = { success: true };
    expect(result.success).toBe(true);
  });

  it("allows constructing session users", () => {
    const user: SessionUser = {
      id: "user-1",
      email: "user@example.com",
      emailVerified: false,
    };
    expect(user.email).toBe("user@example.com");
  });
});

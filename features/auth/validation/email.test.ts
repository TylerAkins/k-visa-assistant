import { describe, expect, it } from "vitest";

import { normalizeEmail } from "@/features/auth/validation/email";

describe("normalizeEmail", () => {
  it("lowercases and trims email", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });
});

import { describe, expect, it } from "vitest";

import { passwordSchema } from "@/features/auth/validation/password-policy";

describe("passwordSchema", () => {
  it("accepts strong passwords", () => {
    expect(
      passwordSchema.safeParse("SecurePass123!").success,
    ).toBe(true);
  });

  it("rejects weak passwords", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase1!").success).toBe(false);
  });
});

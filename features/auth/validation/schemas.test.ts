import { describe, expect, it } from "vitest";

import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  totpCodeSchema,
} from "@/features/auth/validation/schemas";

describe("auth schemas", () => {
  it("normalizes email on register", () => {
    const result = registerSchema.safeParse({
      email: " User@Example.com ",
      password: "SecurePass123!",
      confirmPassword: "SecurePass123!",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("rejects mismatched passwords on register", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "SecurePass123!",
      confirmPassword: "DifferentPass123!",
    });

    expect(result.success).toBe(false);
  });

  it("validates login input", () => {
    expect(
      loginSchema.safeParse({
        email: "user@example.com",
        password: "secret",
      }).success,
    ).toBe(true);
  });

  it("validates reset password input", () => {
    expect(
      resetPasswordSchema.safeParse({
        token: "abc",
        password: "SecurePass123!",
        confirmPassword: "SecurePass123!",
      }).success,
    ).toBe(true);
  });

  it("validates totp code format", () => {
    expect(totpCodeSchema.safeParse({ code: "123456" }).success).toBe(true);
    expect(totpCodeSchema.safeParse({ code: "12345" }).success).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  env: {
    ENCRYPTION_KEY: "test-encryption-key-at-least-32-characters-long",
  },
}));

vi.mock("otplib", async (importOriginal) => {
  const actual = await importOriginal<typeof import("otplib")>();
  return {
    ...actual,
    verify: vi.fn().mockResolvedValue({ valid: true }),
  };
});

import { verify } from "otplib";

import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  verifyRecoveryCode,
  verifyTotpCode,
} from "@/lib/auth/totp";

describe("totp", () => {
  it("generates base32 secrets", () => {
    const secret = generateTotpSecret();
    expect(secret.length).toBeGreaterThan(10);
  });

  it("encrypts and decrypts secrets", () => {
    const secret = generateTotpSecret();
    const encrypted = encryptTotpSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(decryptTotpSecret(encrypted)).toBe(secret);
  });

  it("generates recovery codes", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(codes[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{8}$/);
  });

  it("hashes and verifies recovery codes", async () => {
    const code = "a1b2c3d4-e5f67890";
    const codeHash = await hashRecoveryCode(code);
    expect(await verifyRecoveryCode(codeHash, code)).toBe(true);
    expect(await verifyRecoveryCode(codeHash, "wrong")).toBe(false);
  });

  it("verifies totp codes", async () => {
    await expect(verifyTotpCode("SECRET", "123456")).resolves.toBe(true);
    expect(verify).toHaveBeenCalled();
  });
});

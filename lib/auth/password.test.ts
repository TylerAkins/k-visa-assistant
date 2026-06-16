import { describe, expect, it } from "vitest";

import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  verifyLoginPassword,
  verifyPassword,
} from "@/lib/auth/password";

describe("password", () => {
  it("hashes and verifies passwords", async () => {
    const password = "SecurePass123!";
    const passwordHash = await hashPassword(password);
    expect(passwordHash).not.toBe(password);
    expect(await verifyPassword(passwordHash, password)).toBe(true);
    expect(await verifyPassword(passwordHash, "wrong")).toBe(false);
  });

  it("uses dummy hash when user is null", async () => {
    await expect(
      verifyLoginPassword(null, "any-password"),
    ).resolves.toBeTypeOf("boolean");
  });

  it("verifies against user hash when user exists", async () => {
    const password = "SecurePass123!";
    const passwordHash = await hashPassword(password);
    expect(
      await verifyLoginPassword({ passwordHash }, password),
    ).toBe(true);
    expect(
      await verifyLoginPassword({ passwordHash }, "wrong"),
    ).toBe(false);
  });

  it("exports a valid dummy password hash", async () => {
    expect(DUMMY_PASSWORD_HASH.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(DUMMY_PASSWORD_HASH, "wrong")).toBe(false);
  });

  it("returns false for invalid password hashes", async () => {
    expect(await verifyPassword("not-a-valid-hash", "password")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import {
  generateSecureToken,
  hashToken,
  safeCompare,
} from "@/lib/auth/tokens";

describe("tokens", () => {
  it("generates unique secure tokens", () => {
    const tokenA = generateSecureToken();
    const tokenB = generateSecureToken();
    expect(tokenA).not.toBe(tokenB);
    expect(tokenA.length).toBeGreaterThan(20);
  });

  it("hashes tokens deterministically", () => {
    const token = "test-token";
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(token);
  });

  it("compares strings in constant time when equal", () => {
    const value = hashToken("abc");
    expect(safeCompare(value, value)).toBe(true);
  });

  it("returns false for unequal strings", () => {
    expect(safeCompare("abc", "abd")).toBe(false);
    expect(safeCompare("short", "longer")).toBe(false);
  });
});

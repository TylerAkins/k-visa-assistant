import { afterEach, describe, expect, it } from "vitest";

import {
  checkAuthRateLimit,
  checkAuthRateLimits,
  getAuthRateLimitKeys,
} from "@/lib/security/auth-rate-limit";
import { resetRateLimitsForTests } from "@/lib/security/rate-limit";

describe("auth-rate-limit", () => {
  afterEach(() => {
    resetRateLimitsForTests();
  });

  it("allows requests under the limit", async () => {
    await expect(checkAuthRateLimit("login", "ip:127.0.0.1")).resolves.toEqual({
      allowed: true,
    });
  });

  it("blocks after exceeding the limit", async () => {
    const now = Date.now();
    for (let index = 0; index < 10; index += 1) {
      await checkAuthRateLimit("login", "ip:blocked", now);
    }

    const result = await checkAuthRateLimit("login", "ip:blocked", now);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("checks multiple keys and fails on first blocked", async () => {
    const now = Date.now();
    for (let index = 0; index < 5; index += 1) {
      await checkAuthRateLimit("totp", "user:1", now);
    }

    const result = await checkAuthRateLimits("totp", ["pending:1", "user:1"], now);
    expect(result.allowed).toBe(false);
  });

  it("covers all auth rate limit key prefixes", () => {
    const actions = [
      "login",
      "totp",
      "signup",
      "reset",
      "verify",
      "resend",
      "totp-setup",
      "totp-disable",
      "recovery-regen",
    ] as const;

    for (const action of actions) {
      expect(getAuthRateLimitKeys(action).length).toBeGreaterThan(0);
    }

    expect(getAuthRateLimitKeys("unknown" as never)).toEqual([]);
  });
});

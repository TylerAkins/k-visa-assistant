import { afterEach, describe, expect, it } from "vitest";

import {
  checkRateLimit,
  resetRateLimitsForTests,
} from "@/lib/security/rate-limit";

describe("checkRateLimit", () => {
  afterEach(() => {
    resetRateLimitsForTests();
  });

  it("allows requests within the limit", () => {
    expect(checkRateLimit("health:1.2.3.4", 2, 60_000, 1_000)).toEqual({
      allowed: true,
    });
    expect(checkRateLimit("health:1.2.3.4", 2, 60_000, 2_000)).toEqual({
      allowed: true,
    });
  });

  it("blocks requests above the limit until the window resets", () => {
    expect(checkRateLimit("health:1.2.3.4", 2, 60_000, 1_000)).toEqual({
      allowed: true,
    });
    expect(checkRateLimit("health:1.2.3.4", 2, 60_000, 2_000)).toEqual({
      allowed: true,
    });

    const blocked = checkRateLimit("health:1.2.3.4", 2, 60_000, 3_000);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    }

    expect(checkRateLimit("health:1.2.3.4", 2, 60_000, 61_000)).toEqual({
      allowed: true,
    });
  });
});

import { afterEach, describe, expect, it } from "vitest";

import {
  checkRateLimit,
  getRateLimitBucketCountForTests,
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

  it("purges expired buckets before evaluating a request", () => {
    expect(checkRateLimit("health:old", 1, 1_000, 0)).toEqual({
      allowed: true,
    });
    expect(getRateLimitBucketCountForTests()).toBe(1);

    expect(checkRateLimit("health:new", 1, 1_000, 2_000)).toEqual({
      allowed: true,
    });
    expect(getRateLimitBucketCountForTests()).toBe(1);
  });

  it("does not scan buckets for every request inside the same window", () => {
    expect(checkRateLimit("health:old", 10, 1_000, 0)).toEqual({
      allowed: true,
    });

    expect(checkRateLimit("health:new", 10, 1_000, 500)).toEqual({
      allowed: true,
    });

    expect(getRateLimitBucketCountForTests()).toBe(2);
  });

  it("caps the number of tracked buckets", () => {
    for (let index = 0; index < 10_001; index += 1) {
      checkRateLimit(`health:${index}`, 100, 60_000, 1_000);
    }

    expect(getRateLimitBucketCountForTests()).toBe(10_000);
  });

  it("purges short-window buckets without waiting for long-window cadence", () => {
    expect(checkRateLimit("short", 1, 1_000, 0)).toEqual({
      allowed: true,
    });
    expect(checkRateLimit("long", 1, 60_000, 0)).toEqual({
      allowed: true,
    });
    expect(getRateLimitBucketCountForTests()).toBe(2);

    expect(checkRateLimit("short-again", 1, 1_000, 2_000)).toEqual({
      allowed: true,
    });
    expect(getRateLimitBucketCountForTests()).toBe(2);
  });
});

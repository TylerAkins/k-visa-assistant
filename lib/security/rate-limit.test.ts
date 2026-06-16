import { afterEach, describe, expect, it } from "vitest";

import {
  checkRateLimit,
  getAuthRateLimitBucketCountForTests,
  getGeneralRateLimitBucketCountForTests,
  getRateLimitBucketCountForTests,
  resetRateLimitsForTests,
} from "@/lib/security/rate-limit";

describe("checkRateLimit", () => {
  afterEach(() => {
    resetRateLimitsForTests();
  });

  it("allows requests within the limit", async () => {
    await expect(checkRateLimit("health:1.2.3.4", 2, 60_000, 1_000)).resolves.toEqual({
      allowed: true,
    });
    await expect(checkRateLimit("health:1.2.3.4", 2, 60_000, 2_000)).resolves.toEqual({
      allowed: true,
    });
  });

  it("blocks requests above the limit until the window resets", async () => {
    await expect(checkRateLimit("health:1.2.3.4", 2, 60_000, 1_000)).resolves.toEqual({
      allowed: true,
    });
    await expect(checkRateLimit("health:1.2.3.4", 2, 60_000, 2_000)).resolves.toEqual({
      allowed: true,
    });

    const blocked = await checkRateLimit("health:1.2.3.4", 2, 60_000, 3_000);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    }

    await expect(checkRateLimit("health:1.2.3.4", 2, 60_000, 61_000)).resolves.toEqual({
      allowed: true,
    });
  });

  it("purges expired buckets before evaluating a request", async () => {
    await expect(checkRateLimit("health:old", 1, 1_000, 0)).resolves.toEqual({
      allowed: true,
    });
    expect(getRateLimitBucketCountForTests()).toBe(1);

    await expect(checkRateLimit("health:new", 1, 1_000, 2_000)).resolves.toEqual({
      allowed: true,
    });
    expect(getRateLimitBucketCountForTests()).toBe(1);
  });

  it("does not scan buckets for every request inside the same window", async () => {
    await expect(checkRateLimit("health:old", 10, 1_000, 0)).resolves.toEqual({
      allowed: true,
    });

    await expect(checkRateLimit("health:new", 10, 1_000, 500)).resolves.toEqual({
      allowed: true,
    });

    expect(getRateLimitBucketCountForTests()).toBe(2);
  });

  it("caps the number of tracked general buckets", async () => {
    const now = Date.now();
    for (let index = 0; index < 10_001; index += 1) {
      await checkRateLimit(`health:${index}`, 100, 60_000, now);
    }

    expect(getGeneralRateLimitBucketCountForTests()).toBe(10_000);
  });

  it("keeps auth buckets isolated from general bucket eviction", async () => {
    const now = Date.now();
    for (let index = 0; index < 10_001; index += 1) {
      await checkRateLimit(`health:${index}`, 100, 60_000, now);
    }

    await checkRateLimit("auth:login:ip:stable", 100, 60_000, now);
    expect(getAuthRateLimitBucketCountForTests()).toBe(1);
    await expect(
      checkRateLimit("auth:login:ip:stable", 100, 60_000, now).then(
        (result) => result.allowed,
      ),
    ).resolves.toBe(true);
  });

  it("purges short-window buckets without waiting for long-window cadence", async () => {
    await expect(checkRateLimit("short", 1, 1_000, 0)).resolves.toEqual({
      allowed: true,
    });
    await expect(checkRateLimit("long", 1, 60_000, 0)).resolves.toEqual({
      allowed: true,
    });
    expect(getRateLimitBucketCountForTests()).toBe(2);

    await expect(checkRateLimit("short-again", 1, 1_000, 2_000)).resolves.toEqual({
      allowed: true,
    });
    expect(getRateLimitBucketCountForTests()).toBe(2);
  });
});

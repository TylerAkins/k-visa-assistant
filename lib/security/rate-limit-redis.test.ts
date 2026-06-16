import { afterEach, describe, expect, it, vi } from "vitest";

const redisState = vi.hoisted(() => ({
  incr: vi.fn(),
  pExpire: vi.fn(),
  pTTL: vi.fn(),
  connect: vi.fn(),
  on: vi.fn(),
}));

vi.mock("redis", () => ({
  createClient: vi.fn(() => redisState),
}));

import {
  checkRedisRateLimit,
  resetRedisClientForTests,
} from "@/lib/security/rate-limit-redis";

describe("checkRedisRateLimit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetRedisClientForTests();
    redisState.incr.mockReset();
    redisState.pExpire.mockReset();
    redisState.pTTL.mockReset();
    redisState.connect.mockReset();
    redisState.connect.mockResolvedValue(undefined);
  });

  it("allows requests within the limit", async () => {
    vi.stubEnv("REDIS_URL", "redis://127.0.0.1:6379");
    redisState.incr.mockResolvedValue(1);
    redisState.pExpire.mockResolvedValue(true);

    await expect(
      checkRedisRateLimit("auth:login:ip:1", 5, 60_000, 1_000),
    ).resolves.toEqual({ allowed: true });
    expect(redisState.pExpire).toHaveBeenCalledWith(
      "ratelimit:auth:login:ip:1:0",
      60_000,
    );
  });

  it("blocks requests above the limit", async () => {
    vi.stubEnv("REDIS_URL", "redis://127.0.0.1:6379");
    redisState.incr.mockResolvedValue(6);
    redisState.pTTL.mockResolvedValue(15_000);

    await expect(
      checkRedisRateLimit("auth:login:ip:1", 5, 60_000, 1_000),
    ).resolves.toEqual({ allowed: false, retryAfterSeconds: 15 });
  });
});

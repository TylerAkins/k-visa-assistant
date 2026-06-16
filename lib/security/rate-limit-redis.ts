import type { RedisClientType } from "redis";

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

let clientPromise: Promise<RedisClientType | null> | null = null;

async function getRedisClient(): Promise<RedisClientType | null> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  if (!clientPromise) {
    clientPromise = (async () => {
      const { createClient: createRedisClient } = await import("redis");
      const client = createRedisClient({ url: redisUrl });
      client.on("error", (error) => {
        console.error("[redis] rate limit client error", error);
      });
      await client.connect();
      return client;
    })();
  }

  return clientPromise;
}

export async function checkRedisRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<RateLimitResult> {
  const client = await getRedisClient();
  if (!client) {
    throw new Error("Redis client is not configured");
  }

  const windowId = Math.floor(now / windowMs);
  const redisKey = `ratelimit:${key}:${windowId}`;
  const count = await client.incr(redisKey);

  if (count === 1) {
    await client.pExpire(redisKey, windowMs);
  }

  if (count > limit) {
    const ttlMs = await client.pTTL(redisKey);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
    };
  }

  return { allowed: true };
}

export async function resetRedisRateLimitsForTests(): Promise<void> {
  const client = await getRedisClient();
  if (!client) {
    return;
  }

  const keys = await client.keys("ratelimit:*");
  if (keys.length > 0) {
    await client.del(keys);
  }
}

export function resetRedisClientForTests(): void {
  clientPromise = null;
}

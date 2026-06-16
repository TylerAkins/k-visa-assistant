import { checkRedisRateLimit } from "@/lib/security/rate-limit-redis";

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

type RateLimitBucket = {
  count: number;
  windowStart: number;
  windowMs: number;
};

type BucketStore = Map<string, RateLimitBucket>;

const authBuckets: BucketStore = new Map();
const generalBuckets: BucketStore = new Map();
const lastPurgeAtByWindow = new Map<number, number>();

const MAX_AUTH_BUCKETS = 10_000;
const MAX_GENERAL_BUCKETS = 10_000;

function getBucketStore(key: string): { store: BucketStore; maxBuckets: number } {
  if (key.startsWith("auth:")) {
    return { store: authBuckets, maxBuckets: MAX_AUTH_BUCKETS };
  }

  return { store: generalBuckets, maxBuckets: MAX_GENERAL_BUCKETS };
}

function purgeExpiredBuckets(store: BucketStore, now: number): void {
  for (const [key, bucket] of store) {
    if (now - bucket.windowStart >= bucket.windowMs) {
      store.delete(key);
    }
  }
}

function enforceMaxBuckets(store: BucketStore, maxBuckets: number): void {
  if (store.size <= maxBuckets) {
    return;
  }

  const now = Date.now();
  purgeExpiredBuckets(store, now);

  if (store.size <= maxBuckets) {
    return;
  }

  const sorted = [...store.entries()].sort(
    (left, right) => left[1].windowStart - right[1].windowStart,
  );
  const overflow = store.size - maxBuckets;

  for (const [key] of sorted.slice(0, overflow)) {
    store.delete(key);
  }
}

function maybePurgeExpiredBuckets(
  store: BucketStore,
  now: number,
  windowMs: number,
): void {
  const lastPurgeAt = lastPurgeAtByWindow.get(windowMs) ?? 0;

  if (now - lastPurgeAt >= windowMs || store.size > MAX_GENERAL_BUCKETS) {
    purgeExpiredBuckets(store, now);
    lastPurgeAtByWindow.set(windowMs, now);
  }
}

function checkMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  const { store, maxBuckets } = getBucketStore(key);
  maybePurgeExpiredBuckets(store, now, windowMs);

  const bucket = store.get(key);

  if (!bucket || now - bucket.windowStart >= bucket.windowMs) {
    store.set(key, { count: 1, windowStart: now, windowMs });
    enforceMaxBuckets(store, maxBuckets);
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.ceil(
      (bucket.windowMs - (now - bucket.windowStart)) / 1000,
    );

    return { allowed: false, retryAfterSeconds };
  }

  bucket.count += 1;
  return { allowed: true };
}

function shouldUseRedis(): boolean {
  return Boolean(process.env.REDIS_URL);
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<RateLimitResult> {
  if (shouldUseRedis()) {
    return checkRedisRateLimit(key, limit, windowMs, now);
  }

  return checkMemoryRateLimit(key, limit, windowMs, now);
}

export function resetRateLimitsForTests(): void {
  authBuckets.clear();
  generalBuckets.clear();
  lastPurgeAtByWindow.clear();
}

export function getRateLimitBucketCountForTests(): number {
  return authBuckets.size + generalBuckets.size;
}

export function getAuthRateLimitBucketCountForTests(): number {
  return authBuckets.size;
}

export function getGeneralRateLimitBucketCountForTests(): number {
  return generalBuckets.size;
}

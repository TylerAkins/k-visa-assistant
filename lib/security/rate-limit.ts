type RateLimitBucket = {
  count: number;
  windowStart: number;
};

const buckets = new Map<string, RateLimitBucket>();

const MAX_BUCKETS = 10_000;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

function purgeExpiredBuckets(now: number, windowMs: number): void {
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart >= windowMs) {
      buckets.delete(key);
    }
  }
}

function enforceMaxBuckets(): void {
  if (buckets.size <= MAX_BUCKETS) {
    return;
  }

  const entries = [...buckets.entries()].sort(
    (left, right) => left[1].windowStart - right[1].windowStart,
  );
  const overflow = buckets.size - MAX_BUCKETS;

  for (const [key] of entries.slice(0, overflow)) {
    buckets.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  purgeExpiredBuckets(now, windowMs);

  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    enforceMaxBuckets();
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.ceil(
      (windowMs - (now - bucket.windowStart)) / 1000,
    );

    return { allowed: false, retryAfterSeconds };
  }

  bucket.count += 1;
  return { allowed: true };
}

export function resetRateLimitsForTests(): void {
  buckets.clear();
}

export function getRateLimitBucketCountForTests(): number {
  return buckets.size;
}

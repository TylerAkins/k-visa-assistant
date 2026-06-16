type RateLimitBucket = {
  count: number;
  windowStart: number;
  windowMs: number;
};

const buckets = new Map<string, RateLimitBucket>();
const lastPurgeAtByWindow = new Map<number, number>();

const MAX_BUCKETS = 10_000;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

function purgeExpiredBuckets(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart >= bucket.windowMs) {
      buckets.delete(key);
    }
  }
}

function enforceMaxBuckets(): void {
  if (buckets.size <= MAX_BUCKETS) {
    return;
  }

  const now = Date.now();
  purgeExpiredBuckets(now);

  if (buckets.size <= MAX_BUCKETS) {
    return;
  }

  const evictOldest = (entries: Array<[string, RateLimitBucket]>) => {
    const sorted = entries.sort(
      (left, right) => left[1].windowStart - right[1].windowStart,
    );
    const overflow = buckets.size - MAX_BUCKETS;

    for (const [key] of sorted.slice(0, overflow)) {
      buckets.delete(key);
    }
  };

  const nonAuthEntries = [...buckets.entries()].filter(
    ([key]) => !key.startsWith("auth:"),
  );

  if (nonAuthEntries.length > 0) {
    evictOldest(nonAuthEntries);
  }

  if (buckets.size > MAX_BUCKETS) {
    const authEntries = [...buckets.entries()].filter(([key]) =>
      key.startsWith("auth:"),
    );
    if (authEntries.length > 0 && process.env.NODE_ENV !== "test") {
      console.warn(
        `[rate-limit] Evicting auth buckets after non-auth eviction (${authEntries.length} auth buckets remain before eviction)`,
      );
    }
    evictOldest([...buckets.entries()]);
  }
}

function maybePurgeExpiredBuckets(now: number, windowMs: number): void {
  const lastPurgeAt = lastPurgeAtByWindow.get(windowMs) ?? 0;

  if (now - lastPurgeAt >= windowMs || buckets.size > MAX_BUCKETS) {
    purgeExpiredBuckets(now);
    lastPurgeAtByWindow.set(windowMs, now);
  }
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  maybePurgeExpiredBuckets(now, windowMs);

  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= bucket.windowMs) {
    buckets.set(key, { count: 1, windowStart: now, windowMs });
    enforceMaxBuckets();
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

export function resetRateLimitsForTests(): void {
  buckets.clear();
  lastPurgeAtByWindow.clear();
}

export function getRateLimitBucketCountForTests(): number {
  return buckets.size;
}

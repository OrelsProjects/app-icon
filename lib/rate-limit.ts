type Bucket = {
  hits: number[];
};

const buckets = new Map<string, Bucket>();

const prune = (bucket: Bucket, now: number, windowMs: number) => {
  bucket.hits = bucket.hits.filter((ts) => now - ts < windowMs);
};

/** Best-effort in-memory limiter (per serverless instance). */
export const checkRateLimit = (
  key: string,
  limit: number,
  windowMs: number,
): { ok: true; remaining: number } | { ok: false; retryAfterSec: number } => {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }

  prune(bucket, now, windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0] ?? now;
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  bucket.hits.push(now);
  return { ok: true, remaining: Math.max(0, limit - bucket.hits.length) };
};

export const clientIp = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
};

/** Periodically drop empty buckets to avoid unbounded growth. */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      prune(bucket, now, 24 * 60 * 60 * 1000);
      if (bucket.hits.length === 0) buckets.delete(key);
    }
  }, 10 * 60 * 1000).unref?.();
}

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds: number;
};

const buckets = new Map<string, RateLimitEntry>();
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken
  ? new Redis({ url: redisUrl, token: redisToken })
  : null;
const ratelimits = new Map<string, Ratelimit>();
let warnedMemoryFallback = false;

const warnFallback = () => {
  if (redis || warnedMemoryFallback) return;

  warnedMemoryFallback = true;
  console.warn("[rate-limit] Upstash env missing, using in-memory fallback");
};

const fallbackRateLimit = ({
  key,
  limit,
  windowMs,
}: RateLimitOptions): RateLimitResult => {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
};

const getRatelimit = (limit: number, windowMs: number) => {
  if (!redis) return null;

  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const cacheKey = `${limit}:${windowSeconds}`;
  const existing = ratelimits.get(cacheKey);

  if (existing) return existing;

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    analytics: true,
    prefix: "boltushka24:ratelimit",
  });

  ratelimits.set(cacheKey, ratelimit);
  return ratelimit;
};

export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const ratelimit = getRatelimit(options.limit, options.windowMs);

  if (!ratelimit) {
    warnFallback();
    return fallbackRateLimit(options);
  }

  const result = await ratelimit.limit(options.key);

  return {
    ok: result.success,
    retryAfterSeconds: result.success
      ? 0
      : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
  };
}

export function rateLimitKey(scope: string, profileId: string, targetId: string) {
  return `${scope}:${profileId}:${targetId}`;
}

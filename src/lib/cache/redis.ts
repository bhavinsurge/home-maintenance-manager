import Redis from "ioredis";
import { logger } from "@/lib/logger";

const globalForRedis = globalThis as unknown as {
  redis?: Redis | null;
  memoryLimits?: Map<string, { count: number; resetAt: number }>;
};

function createRedis() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    client.on("error", (err) => {
      logger.warn({ err }, "Redis error");
    });
    return client;
  } catch {
    return null;
  }
}

export function getRedis() {
  if (globalForRedis.redis === undefined) {
    globalForRedis.redis = createRedis();
  }
  return globalForRedis.redis;
}

function memoryStore() {
  if (!globalForRedis.memoryLimits) {
    globalForRedis.memoryLimits = new Map();
  }
  return globalForRedis.memoryLimits;
}

/** Sliding fixed-window counter. Returns remaining attempts and whether limited. */
export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status !== "ready") {
        await redis.connect().catch(() => undefined);
      }
      const redisKey = `rl:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.pexpire(redisKey, windowMs);
      }
      const ttl = await redis.pttl(redisKey);
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        retryAfterMs: ttl > 0 ? ttl : windowMs,
      };
    } catch (err) {
      logger.warn({ err }, "Redis rate limit failed; using memory fallback");
    }
  }

  const store = memoryStore();
  const now = Date.now();
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterMs: windowMs };
  }
  current.count += 1;
  store.set(key, current);
  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    retryAfterMs: Math.max(0, current.resetAt - now),
  };
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    if (redis.status !== "ready") await redis.connect().catch(() => undefined);
    const raw = await redis.get(`cache:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number) {
  const redis = getRedis();
  if (!redis) return;
  try {
    if (redis.status !== "ready") await redis.connect().catch(() => undefined);
    await redis.set(`cache:${key}`, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // ignore
  }
}

export async function cacheDel(patternOrKey: string) {
  const redis = getRedis();
  if (!redis) return;
  try {
    if (redis.status !== "ready") await redis.connect().catch(() => undefined);
    await redis.del(`cache:${patternOrKey}`);
  } catch {
    // ignore
  }
}

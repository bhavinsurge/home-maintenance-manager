import Redis from 'ioredis';
import { Logger } from '@nestjs/common';
import { rateLimited } from '../common/errors/app-error';

const logger = new Logger('Redis');

const globalForRedis = globalThis as unknown as {
  nestRedis?: Redis | null;
  nestMemoryLimits?: Map<string, { count: number; resetAt: number }>;
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
    client.on('error', (err) => {
      logger.warn(`Redis error: ${err.message}`);
    });
    return client;
  } catch {
    return null;
  }
}

export function getRedis() {
  if (globalForRedis.nestRedis === undefined) {
    globalForRedis.nestRedis = createRedis();
  }
  return globalForRedis.nestRedis;
}

function memoryStore() {
  if (!globalForRedis.nestMemoryLimits) {
    globalForRedis.nestMemoryLimits = new Map();
  }
  return globalForRedis.nestMemoryLimits;
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
) {
  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status !== 'ready') {
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
      logger.warn(
        `Redis rate limit failed; using memory fallback: ${String(err)}`,
      );
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

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
) {
  const result = await consumeRateLimit(key, limit, windowMs);
  if (!result.allowed) throw rateLimited();
  return result;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    if (redis.status !== 'ready') await redis.connect().catch(() => undefined);
    const raw = await redis.get(`cache:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
) {
  const redis = getRedis();
  if (!redis) return;
  try {
    if (redis.status !== 'ready') await redis.connect().catch(() => undefined);
    await redis.set(`cache:${key}`, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // ignore
  }
}

export async function cacheDel(patternOrKey: string) {
  const redis = getRedis();
  if (!redis) return;
  try {
    if (redis.status !== 'ready') await redis.connect().catch(() => undefined);
    await redis.del(`cache:${patternOrKey}`);
  } catch {
    // ignore
  }
}

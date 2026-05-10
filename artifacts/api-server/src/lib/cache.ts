import Redis from "ioredis";
import { logger } from "./logger";
import type { Request, Response, NextFunction } from "express";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const CACHE_PREFIX = "ecostore:cache:";
const TAG_PREFIX = "ecostore:tag:";

let redisClient: Redis | null = null;

export function getRedis(): Redis | null {
  if (redisClient) return redisClient;
  try {
    const client = new Redis(REDIS_URL, {
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    client.on("error", (err) => {
      logger.warn({ err }, "Redis connection error — running without cache");
      redisClient = null;
    });
    client.on("connect", () => logger.info("Redis connected"));
    redisClient = client;
  } catch {
    logger.warn("Redis unavailable — running without cache");
    redisClient = null;
  }
  return redisClient;
}

export async function cacheGet(key: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get(CACHE_PREFIX + key);
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds = 60,
  tags: string[] = [],
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const fullKey = CACHE_PREFIX + key;
  try {
    const pipeline = redis.pipeline();
    pipeline.set(fullKey, value, "EX", ttlSeconds);
    for (const tag of tags) {
      pipeline.sadd(TAG_PREFIX + tag, fullKey);
      pipeline.expire(TAG_PREFIX + tag, ttlSeconds * 2);
    }
    await pipeline.exec();
  } catch {
    // ignore
  }
}

export async function cacheDel(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(CACHE_PREFIX + key);
  } catch {
    // ignore
  }
}

export async function invalidateTags(tags: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const pipeline = redis.pipeline();
    const keyGroups = await Promise.all(
      tags.map((tag) => redis.smembers(TAG_PREFIX + tag)),
    );
    const allKeys = [...new Set(keyGroups.flat())];
    if (allKeys.length > 0) {
      for (const key of allKeys) pipeline.del(key);
    }
    for (const tag of tags) pipeline.del(TAG_PREFIX + tag);
    await pipeline.exec();
    if (allKeys.length > 0) {
      logger.debug({ tags, count: allKeys.length }, "Cache invalidated");
    }
  } catch {
    // ignore
  }
}

export async function invalidatePattern(prefix: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const keys = await redis.keys(CACHE_PREFIX + prefix + "*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // ignore
  }
}

interface WithCacheOptions {
  key: (req: Request) => string;
  ttl?: number;
  tags?: string[];
}

export function withCache(options: WithCacheOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const cacheKey = options.key(req);
    const cached = await cacheGet(cacheKey);

    if (cached !== null) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("X-Cache-Key", cacheKey);
      res.json(JSON.parse(cached));
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown): Response => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheSet(cacheKey, JSON.stringify(body), options.ttl ?? 60, options.tags ?? []).catch(
          () => {},
        );
      }
      res.setHeader("X-Cache", "MISS");
      return originalJson(body);
    };

    next();
  };
}

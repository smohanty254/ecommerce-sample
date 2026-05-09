import Redis from "ioredis";
import { logger } from "./logger";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let redisClient: Redis | null = null;

export function getRedis(): Redis | null {
  if (!redisClient) {
    try {
      redisClient = new Redis(REDIS_URL, {
        lazyConnect: true,
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
      });
      redisClient.on("error", (err) => {
        logger.warn({ err }, "Redis connection error — running without cache");
        redisClient = null;
      });
    } catch {
      logger.warn("Redis unavailable — running without cache");
      redisClient = null;
    }
  }
  return redisClient;
}

export async function cacheGet(key: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds = 60): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, "EX", ttlSeconds);
  } catch {
    // ignore
  }
}

export async function cacheDel(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // ignore
  }
}

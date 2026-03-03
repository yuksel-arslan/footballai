import Redis from 'ioredis'
import { config } from '../config'
import { logger } from '../lib/logger'

class CacheService {
  private client: Redis | null = null

  constructor() {
    if (config.redisUrl) {
      try {
        this.client = new Redis(config.redisUrl, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        })
        this.client.connect().catch((err) => {
          logger.warn({ err }, 'Redis connection failed, running without cache')
          this.client = null
        })
      } catch {
        logger.warn('Redis not available, running without cache')
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null
    try {
      const data = await this.client.get(key)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (!this.client) return
    try {
      await this.client.setex(key, ttlSeconds, JSON.stringify(value))
    } catch {
      // Silently fail cache writes
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return
    try {
      await this.client.del(key)
    } catch {
      // Silently fail
    }
  }
}

export const cacheService = new CacheService()

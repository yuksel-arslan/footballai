import Redis from 'ioredis'
import { config } from '../config'
import { logger } from '../lib/logger'

class CacheService {
  private client: Redis | null = null

  constructor() {
    if (config.redisUrl) {
      this.client = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000)
          return delay
        },
      })

      this.client.on('connect', () => {
        logger.info('Redis connected')
      })

      this.client.on('error', (err) => {
        logger.error({ err }, 'Redis error')
      })
    } else {
      logger.warn('Redis URL not configured, cache disabled')
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null

    try {
      const data = await this.client.get(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      logger.error({ error }, 'Cache get error')
      return null
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.client) return

    try {
      const serialized = JSON.stringify(value)
      if (ttl) {
        await this.client.setex(key, ttl, serialized)
      } else {
        await this.client.set(key, serialized)
      }
    } catch (error) {
      logger.error({ error }, 'Cache set error')
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return

    try {
      await this.client.del(key)
    } catch (error) {
      logger.error({ error }, 'Cache delete error')
    }
  }

  async clear(pattern?: string): Promise<void> {
    if (!this.client) return

    try {
      if (pattern) {
        const keys = await this.client.keys(pattern)
        if (keys.length > 0) {
          await this.client.del(...keys)
        }
      } else {
        await this.client.flushdb()
      }
    } catch (error) {
      logger.error({ error }, 'Cache clear error')
    }
  }

  // Generate cache key
  key(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`
  }
}

export const cache = new CacheService()

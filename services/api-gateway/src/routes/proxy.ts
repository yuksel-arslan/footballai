import { Router, type Router as RouterType } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { routeMap, services } from '../config/services'
import { authLimiter } from '../middleware/rate-limiter'
import { logger } from '../lib/logger'

const router: RouterType = Router()

// Apply auth rate limiter to auth routes
router.use('/api/auth', authLimiter)

// Setup proxy for each route
for (const route of routeMap) {
  router.use(
    route.path,
    createProxyMiddleware({
      target: route.target,
      changeOrigin: true,
      timeout: 30000,
      on: {
        error: (err, _req, res) => {
          logger.error(
            { err, path: route.path },
            `Proxy error for ${route.path}`
          )
          if ('writeHead' in res && typeof res.writeHead === 'function') {
            ;(res as any).writeHead(502, { 'Content-Type': 'application/json' })
            ;(res as any).end(JSON.stringify({ error: 'Service unavailable' }))
          }
        },
      },
    })
  )
}

// Health check that aggregates all services
router.get('/health', async (_req, res) => {
  const checks: Record<string, string> = { gateway: 'ok' }

  const serviceChecks = Object.entries(services).map(async ([name, url]) => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)

      const response = await fetch(`${url}/health`, {
        signal: controller.signal,
      })
      clearTimeout(timeout)

      checks[name] = response.ok ? 'ok' : 'error'
    } catch {
      checks[name] = 'unreachable'
    }
  })

  await Promise.allSettled(serviceChecks)

  const allOk = Object.values(checks).every((s) => s === 'ok')
  res.status(allOk ? 200 : 207).json({
    status: allOk ? 'ok' : 'degraded',
    services: checks,
    timestamp: new Date(),
  })
})

export default router

import { Router, type Router as RouterType } from 'express'

const router: RouterType = Router()

// GET /api/leagues
router.get('/', async (_req, res) => {
  res.json({ message: 'Leagues endpoint - Coming soon' })
})

export default router

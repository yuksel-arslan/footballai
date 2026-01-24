import { Router, type Router as RouterType } from 'express'

const router: RouterType = Router()

// GET /api/teams/:id
router.get('/:id', async (_req, res) => {
  res.json({ message: 'Team endpoint - Coming soon' })
})

export default router

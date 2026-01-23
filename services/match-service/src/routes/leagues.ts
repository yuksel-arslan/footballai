import { Router } from 'express'

const router = Router()

// GET /api/leagues
router.get('/', async (req, res) => {
  res.json({ message: 'Leagues endpoint - Coming soon' })
})

export default router

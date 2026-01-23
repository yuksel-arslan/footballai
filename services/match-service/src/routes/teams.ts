import { Router } from 'express'

const router = Router()

// GET /api/teams/:id
router.get('/:id', async (req, res) => {
  res.json({ message: 'Team endpoint - Coming soon' })
})

export default router

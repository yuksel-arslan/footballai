import { Router } from 'express'
import { authController } from '../controllers/auth.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { asyncHandler } from '../middleware/async-handler'

const router = Router()

router.post('/register', asyncHandler(authController.register.bind(authController)))
router.post('/login', asyncHandler(authController.login.bind(authController)))
router.post('/logout', authMiddleware, asyncHandler(authController.logout.bind(authController)))
router.get('/me', authMiddleware, asyncHandler(authController.me.bind(authController)))

export default router

import { Router } from 'express'
import { authController } from '@/controllers/auth-controller'
import { asyncHandler } from '@/middleware/async-handler'
import { authenticate } from '@/middleware/auth'

const router = Router()

// Public routes
router.post('/register', asyncHandler(authController.register.bind(authController)))
router.post('/login', asyncHandler(authController.login.bind(authController)))
router.post('/refresh', asyncHandler(authController.refresh.bind(authController)))

// Protected routes
router.get('/me', authenticate, asyncHandler(authController.me.bind(authController)))
router.post(
  '/change-password',
  authenticate,
  asyncHandler(authController.changePassword.bind(authController))
)

export default router

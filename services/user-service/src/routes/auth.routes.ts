import { Router } from 'express'
import { authController } from '../controllers/auth.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { asyncHandler } from '../middleware/async-handler'

const router = Router()

// Public routes
router.post('/register', asyncHandler(authController.register.bind(authController)))
router.post('/login', asyncHandler(authController.login.bind(authController)))

// Password reset (public)
router.post('/forgot-password', asyncHandler(authController.forgotPassword.bind(authController)))
router.post('/reset-password', asyncHandler(authController.resetPassword.bind(authController)))

// Email verification (public)
router.post('/verify-email', asyncHandler(authController.verifyEmail.bind(authController)))

// 2FA verify during login (public - user not yet authenticated)
router.post('/2fa/verify', asyncHandler(authController.verify2FA.bind(authController)))

// Google OAuth (public)
router.get('/google', authController.googleAuth.bind(authController))
router.get('/google/callback', asyncHandler(authController.googleCallback.bind(authController)))

// Protected routes
router.post('/logout', authMiddleware, asyncHandler(authController.logout.bind(authController)))
router.get('/me', authMiddleware, asyncHandler(authController.me.bind(authController)))

// 2FA management (protected)
router.post('/2fa/setup', authMiddleware, asyncHandler(authController.setup2FA.bind(authController)))
router.post('/2fa/enable', authMiddleware, asyncHandler(authController.enable2FA.bind(authController)))
router.post('/2fa/disable', authMiddleware, asyncHandler(authController.disable2FA.bind(authController)))

export default router

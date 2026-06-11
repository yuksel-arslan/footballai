import { Router, type Router as RouterType } from 'express'
import { authController } from '../controllers/auth.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { asyncHandler } from '../middleware/async-handler'

const router: RouterType = Router()

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               fullName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered
 *       400:
 *         description: Validation error
 */
router.post(
  '/register',
  asyncHandler(authController.register.bind(authController))
)

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: JWT token returned
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', asyncHandler(authController.login.bind(authController)))

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Reset email sent
 */
router.post(
  '/forgot-password',
  asyncHandler(authController.forgotPassword.bind(authController))
)

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post(
  '/reset-password',
  asyncHandler(authController.resetPassword.bind(authController))
)

/**
 * @openapi
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email address
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Email verified
 */
router.post(
  '/verify-email',
  asyncHandler(authController.verifyEmail.bind(authController))
)

/**
 * @openapi
 * /api/auth/2fa/verify:
 *   post:
 *     summary: Verify 2FA code during login
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 2FA verified, JWT returned
 */
router.post(
  '/2fa/verify',
  asyncHandler(authController.verify2FA.bind(authController))
)

/**
 * @openapi
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to Google
 */
router.get('/google', authController.googleAuth.bind(authController))
router.get(
  '/google/callback',
  asyncHandler(authController.googleCallback.bind(authController))
)

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout and invalidate token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post(
  '/logout',
  authMiddleware,
  asyncHandler(authController.logout.bind(authController))
)

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(authController.me.bind(authController))
)

/**
 * @openapi
 * /api/auth/2fa/setup:
 *   post:
 *     summary: Setup two-factor authentication
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA QR code returned
 */
router.post(
  '/2fa/setup',
  authMiddleware,
  asyncHandler(authController.setup2FA.bind(authController))
)
router.post(
  '/2fa/enable',
  authMiddleware,
  asyncHandler(authController.enable2FA.bind(authController))
)
router.post(
  '/2fa/disable',
  authMiddleware,
  asyncHandler(authController.disable2FA.bind(authController))
)

// Mail delivery diagnostics: config snapshot (no secrets) + optional test
// send (?send=ADMIN_EMAIL — restricted to admin addresses, so it can't be
// abused to mail arbitrary recipients).
router.get(
  '/mail-diag',
  asyncHandler(authController.mailDiag.bind(authController))
)

export default router

import { Router, type Router as RouterType } from 'express'
import { profileController } from '../controllers/profile.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { asyncHandler } from '../middleware/async-handler'

const router: RouterType = Router()

// All profile routes require authentication
router.use(authMiddleware)

/**
 * @openapi
 * /api/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *   put:
 *     summary: Update user profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.get(
  '/',
  asyncHandler(profileController.getProfile.bind(profileController))
)
router.put(
  '/',
  asyncHandler(profileController.updateProfile.bind(profileController))
)

/**
 * @openapi
 * /api/profile/favorites/teams:
 *   get:
 *     summary: Get favorite teams
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of favorite teams
 * /api/profile/favorites/teams/{id}:
 *   post:
 *     summary: Add favorite team
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Team added to favorites
 *   delete:
 *     summary: Remove favorite team
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Team removed from favorites
 */
router.get(
  '/favorites/teams',
  asyncHandler(profileController.getFavoriteTeams.bind(profileController))
)
router.post(
  '/favorites/teams/:id',
  asyncHandler(profileController.addFavoriteTeam.bind(profileController))
)
router.delete(
  '/favorites/teams/:id',
  asyncHandler(profileController.removeFavoriteTeam.bind(profileController))
)

/**
 * @openapi
 * /api/profile/favorites/leagues:
 *   get:
 *     summary: Get favorite leagues
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of favorite leagues
 * /api/profile/favorites/leagues/{id}:
 *   post:
 *     summary: Add favorite league
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: League added to favorites
 *   delete:
 *     summary: Remove favorite league
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: League removed from favorites
 */
router.get(
  '/favorites/leagues',
  asyncHandler(profileController.getFavoriteLeagues.bind(profileController))
)
router.post(
  '/favorites/leagues/:id',
  asyncHandler(profileController.addFavoriteLeague.bind(profileController))
)
router.delete(
  '/favorites/leagues/:id',
  asyncHandler(profileController.removeFavoriteLeague.bind(profileController))
)

export default router

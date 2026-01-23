import { Router } from 'express'
import { userController } from '@/controllers/user-controller'
import { asyncHandler } from '@/middleware/async-handler'
import { authenticate } from '@/middleware/auth'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Profile routes
router.get('/profile', asyncHandler(userController.getProfile.bind(userController)))
router.put('/profile', asyncHandler(userController.updateProfile.bind(userController)))
router.delete('/profile', asyncHandler(userController.deleteAccount.bind(userController)))

// Favorites - Teams
router.get(
  '/favorites/teams',
  asyncHandler(userController.getFavoriteTeams.bind(userController))
)
router.post(
  '/favorites/teams/:id',
  asyncHandler(userController.addFavoriteTeam.bind(userController))
)
router.delete(
  '/favorites/teams/:id',
  asyncHandler(userController.removeFavoriteTeam.bind(userController))
)

// Favorites - Leagues
router.get(
  '/favorites/leagues',
  asyncHandler(userController.getFavoriteLeagues.bind(userController))
)
router.post(
  '/favorites/leagues/:id',
  asyncHandler(userController.addFavoriteLeague.bind(userController))
)
router.delete(
  '/favorites/leagues/:id',
  asyncHandler(userController.removeFavoriteLeague.bind(userController))
)

// Notifications
router.get(
  '/notifications',
  asyncHandler(userController.getNotifications.bind(userController))
)
router.post(
  '/notifications/:id/read',
  asyncHandler(userController.markNotificationRead.bind(userController))
)
router.post(
  '/notifications/read-all',
  asyncHandler(userController.markAllNotificationsRead.bind(userController))
)

export default router

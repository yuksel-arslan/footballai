import { Router, type Router as RouterType } from 'express'
import { profileController } from '../controllers/profile.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { asyncHandler } from '../middleware/async-handler'

const router: RouterType = Router()

// All profile routes require authentication
router.use(authMiddleware)

// Profile
router.get('/', asyncHandler(profileController.getProfile.bind(profileController)))
router.put('/', asyncHandler(profileController.updateProfile.bind(profileController)))

// Favorite teams
router.get('/favorites/teams', asyncHandler(profileController.getFavoriteTeams.bind(profileController)))
router.post('/favorites/teams/:id', asyncHandler(profileController.addFavoriteTeam.bind(profileController)))
router.delete('/favorites/teams/:id', asyncHandler(profileController.removeFavoriteTeam.bind(profileController)))

// Favorite leagues
router.get('/favorites/leagues', asyncHandler(profileController.getFavoriteLeagues.bind(profileController)))
router.post('/favorites/leagues/:id', asyncHandler(profileController.addFavoriteLeague.bind(profileController)))
router.delete('/favorites/leagues/:id', asyncHandler(profileController.removeFavoriteLeague.bind(profileController)))

export default router

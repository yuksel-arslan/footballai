import { Router, Request, Response } from 'express'
import { PrismaClient } from '@football-ai/database'
import { asyncHandler } from '../middleware/async-handler'

const prisma = new PrismaClient()
const router: Router = Router()

// GET /api/notifications — List user notifications (paginated)
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId as string
    const page = Math.max(1, parseInt(String(req.query.page || '1')))
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'))))
    const skip = (page - 1) * limit

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
    ])

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  })
)

// GET /api/notifications/unread-count — Unread count
router.get(
  '/unread-count',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId as string

    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    })

    res.json({ success: true, data: { count } })
  })
)

// PATCH /api/notifications/:id/read — Mark as read
router.patch(
  '/:id/read',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId as string
    const id = parseInt(String(req.params.id))

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    })

    if (!notification) {
      res.status(404).json({ success: false, error: 'Notification not found' })
      return
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    })

    res.json({ success: true, data: updated })
  })
)

// PATCH /api/notifications/read-all — Mark all as read
router.patch(
  '/read-all',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId as string

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })

    res.json({ success: true })
  })
)

// DELETE /api/notifications/:id — Delete notification
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId as string
    const id = parseInt(String(req.params.id))

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    })

    if (!notification) {
      res.status(404).json({ success: false, error: 'Notification not found' })
      return
    }

    await prisma.notification.delete({ where: { id } })
    res.json({ success: true })
  })
)

export default router
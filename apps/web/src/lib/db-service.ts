/**
 * Direct database operations for when user-service is unavailable.
 * Provides Prisma-based fallbacks for profile, notifications, and predictions.
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// ============================================
// PROFILE
// ============================================

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      country: true,
      preferredLang: true,
      theme: true,
      isAdmin: true,
      emailVerified: true,
      twoFactorEnabled: true,
      createdAt: true,
      lastLoginAt: true,
    },
  })
  return user
}

export async function updateProfile(
  userId: string,
  data: {
    fullName?: string
    avatarUrl?: string
    country?: string
    preferredLang?: string
    theme?: string
  }
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      country: true,
      preferredLang: true,
      theme: true,
      isAdmin: true,
      emailVerified: true,
      twoFactorEnabled: true,
      createdAt: true,
      lastLoginAt: true,
    },
  })
  return user
}

// ============================================
// NOTIFICATIONS
// ============================================

export async function getNotifications(userId: string, page: number = 1) {
  const limit = 20
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

  return {
    success: true,
    data: notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getUnreadCount(userId: string) {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  })
  return { success: true, data: { count } }
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })
  return { success: true, message: 'All notifications marked as read' }
}

export async function markAsRead(userId: string, notificationId: number) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  })
  if (!notification) return null

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  })
  return { success: true }
}

export async function deleteNotification(
  userId: string,
  notificationId: number
) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  })
  if (!notification) return null

  await prisma.notification.delete({ where: { id: notificationId } })
  return { success: true }
}

// ============================================
// USER PREDICTIONS
// ============================================

export async function getUserPredictions(
  userId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit

  const [predictions, total] = await Promise.all([
    prisma.userPrediction.findMany({
      where: { userId },
      include: {
        prediction: {
          include: {
            fixture: {
              include: {
                homeTeam: { select: { id: true, name: true, logoUrl: true } },
                awayTeam: { select: { id: true, name: true, logoUrl: true } },
                league: { select: { id: true, name: true, logoUrl: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.userPrediction.count({ where: { userId } }),
  ])

  return {
    success: true,
    data: predictions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function createUserPrediction(
  userId: string,
  data: { predictionId: number; predictedResult: string }
) {
  const prediction = await prisma.userPrediction.create({
    data: {
      userId,
      predictionId: data.predictionId,
      predictedResult: data.predictedResult,
    },
  })
  return { success: true, data: prediction }
}

export async function getPredictionStats(userId: string) {
  const [total, correct] = await Promise.all([
    prisma.userPrediction.count({ where: { userId } }),
    prisma.userPrediction.count({ where: { userId, wasCorrect: true } }),
  ])

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  return {
    success: true,
    data: {
      totalPredictions: total,
      correctPredictions: correct,
      accuracy,
    },
  }
}

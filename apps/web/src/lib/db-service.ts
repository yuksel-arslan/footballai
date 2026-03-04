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
  data: {
    predictionId: number
    fixtureId?: number
    predictedResult: string
    predictedHomeScore?: number
    predictedAwayScore?: number
  }
) {
  const prediction = await prisma.userPrediction.upsert({
    where: {
      userId_fixtureId: {
        userId,
        fixtureId: data.fixtureId ?? 0,
      },
    },
    update: {
      predictionId: data.predictionId,
      predictedResult: data.predictedResult,
      predictedHomeScore: data.predictedHomeScore ?? null,
      predictedAwayScore: data.predictedAwayScore ?? null,
    },
    create: {
      userId,
      predictionId: data.predictionId,
      fixtureId: data.fixtureId ?? null,
      predictedResult: data.predictedResult,
      predictedHomeScore: data.predictedHomeScore ?? null,
      predictedAwayScore: data.predictedAwayScore ?? null,
    },
  })
  return { success: true, data: prediction }
}

export async function getPredictionStats(userId: string) {
  const [total, correct, scoreCorrect] = await Promise.all([
    prisma.userPrediction.count({ where: { userId } }),
    prisma.userPrediction.count({ where: { userId, wasCorrect: true } }),
    prisma.userPrediction.count({ where: { userId, scoreCorrect: true } }),
  ])

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  return {
    success: true,
    data: {
      totalPredictions: total,
      correctPredictions: correct,
      scoreCorrectPredictions: scoreCorrect,
      accuracy,
    },
  }
}

// ============================================
// RESOLVE PREDICTIONS (after match finishes)
// ============================================

function getMatchResult(homeScore: number, awayScore: number): string {
  if (homeScore > awayScore) return 'home'
  if (homeScore < awayScore) return 'away'
  return 'draw'
}

export async function resolvePredictions() {
  // Find finished fixtures with unresolved predictions
  const finishedFixtures = await prisma.fixture.findMany({
    where: {
      status: 'FINISHED',
      homeScore: { not: null },
      awayScore: { not: null },
      predictions: {
        some: { wasCorrect: null },
      },
    },
    include: {
      predictions: { where: { wasCorrect: null } },
      userPredictions: { where: { wasCorrect: null } },
    },
    take: 100,
  })

  let resolvedAI = 0
  let resolvedUser = 0

  for (const fixture of finishedFixtures) {
    const homeScore = fixture.homeScore!
    const awayScore = fixture.awayScore!
    const actualResult = getMatchResult(homeScore, awayScore)

    // Resolve AI predictions
    for (const pred of fixture.predictions) {
      const predictedResult = getMatchResult(
        Math.round(pred.predictedHomeScore),
        Math.round(pred.predictedAwayScore)
      )
      const wasCorrect = predictedResult === actualResult
      const scoreCorrect =
        Math.round(pred.predictedHomeScore) === homeScore &&
        Math.round(pred.predictedAwayScore) === awayScore

      await prisma.prediction.update({
        where: { id: pred.id },
        data: {
          predictedResult,
          actualResult,
          wasCorrect,
          scoreCorrect,
        },
      })
      resolvedAI++
    }

    // Resolve user predictions
    for (const userPred of fixture.userPredictions) {
      const wasCorrect = userPred.predictedResult === actualResult
      const scoreCorrect =
        userPred.predictedHomeScore !== null &&
        userPred.predictedAwayScore !== null &&
        userPred.predictedHomeScore === homeScore &&
        userPred.predictedAwayScore === awayScore

      await prisma.userPrediction.update({
        where: { id: userPred.id },
        data: {
          actualResult,
          wasCorrect,
          scoreCorrect: scoreCorrect || false,
        },
      })
      resolvedUser++
    }
  }

  return {
    success: true,
    data: {
      fixturesProcessed: finishedFixtures.length,
      aiPredictionsResolved: resolvedAI,
      userPredictionsResolved: resolvedUser,
    },
  }
}

// ============================================
// PREDICTION COMPARISON (AI vs User vs Actual)
// ============================================

export async function getPredictionComparison(fixtureId: number, userId?: string) {
  const fixture = await prisma.fixture.findUnique({
    where: { id: fixtureId },
    include: {
      homeTeam: { select: { id: true, name: true, logoUrl: true } },
      awayTeam: { select: { id: true, name: true, logoUrl: true } },
      league: { select: { id: true, name: true } },
      predictions: { orderBy: { createdAt: 'desc' }, take: 1 },
      userPredictions: userId
        ? { where: { userId }, take: 1 }
        : { take: 0 },
    },
  })

  if (!fixture) return null

  const aiPrediction = fixture.predictions[0] || null
  const userPrediction = fixture.userPredictions[0] || null

  return {
    fixture: {
      id: fixture.id,
      status: fixture.status,
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      league: fixture.league,
      matchDate: fixture.matchDate,
    },
    aiPrediction: aiPrediction
      ? {
          predictedResult: aiPrediction.predictedResult,
          predictedHomeScore: aiPrediction.predictedHomeScore,
          predictedAwayScore: aiPrediction.predictedAwayScore,
          homeWinProb: aiPrediction.homeWinProb,
          drawProb: aiPrediction.drawProb,
          awayWinProb: aiPrediction.awayWinProb,
          confidence: aiPrediction.confidence,
          wasCorrect: aiPrediction.wasCorrect,
          scoreCorrect: aiPrediction.scoreCorrect,
        }
      : null,
    userPrediction: userPrediction
      ? {
          predictedResult: userPrediction.predictedResult,
          predictedHomeScore: userPrediction.predictedHomeScore,
          predictedAwayScore: userPrediction.predictedAwayScore,
          wasCorrect: userPrediction.wasCorrect,
          scoreCorrect: userPrediction.scoreCorrect,
        }
      : null,
    actualResult:
      fixture.status === 'FINISHED' && fixture.homeScore !== null
        ? getMatchResult(fixture.homeScore!, fixture.awayScore!)
        : null,
  }
}

export async function getAIAccuracyStats() {
  const [total, correct, scoreCorrect] = await Promise.all([
    prisma.prediction.count({ where: { wasCorrect: { not: null } } }),
    prisma.prediction.count({ where: { wasCorrect: true } }),
    prisma.prediction.count({ where: { scoreCorrect: true } }),
  ])

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  return {
    success: true,
    data: {
      totalPredictions: total,
      correctPredictions: correct,
      scoreCorrectPredictions: scoreCorrect,
      accuracy,
    },
  }
}

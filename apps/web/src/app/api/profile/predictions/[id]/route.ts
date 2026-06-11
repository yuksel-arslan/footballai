import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-service'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    process.env.APP_DATABASE_URL
      ? { datasourceUrl: process.env.APP_DATABASE_URL }
      : undefined
  )
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { id } = await params
    const predictionId = parseInt(id)

    // Only allow users to delete their own predictions
    const prediction = await prisma.userPrediction.findFirst({
      where: { id: predictionId, userId: decoded.userId },
    })

    if (!prediction) {
      return NextResponse.json(
        { success: false, error: 'Prediction not found' },
        { status: 404 }
      )
    }

    await prisma.userPrediction.delete({
      where: { id: predictionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete prediction error:', error)
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 500 }
    )
  }
}

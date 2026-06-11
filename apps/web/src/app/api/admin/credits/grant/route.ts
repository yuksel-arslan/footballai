import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, CreditTransactionType, Prisma } from '@prisma/client'
import { verifyToken } from '@/lib/auth-service'

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

/**
 * POST /api/admin/credits/grant
 * Body: { userId?: string, email?: string, amount: number, note?: string }
 * (one of userId or email is required; email is looked up case-insensitively)
 * Auth: requires admin JWT.
 *
 * Manual credit grant — used for testing and pre-Whop top-ups. Once the
 * Whop webhook is wired up, day-to-day grants should flow through there.
 */
export async function POST(request: NextRequest) {
  try {
    const token =
      request.cookies.get('auth-token')?.value ||
      (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    if (!token) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    const decoded = verifyToken(token)
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'admin_required' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (
      !body ||
      typeof body.amount !== 'number' ||
      (typeof body.userId !== 'string' && typeof body.email !== 'string')
    ) {
      return NextResponse.json(
        {
          error: 'invalid_body',
          expected: { 'userId|email': 'string', amount: 'number' },
        },
        { status: 400 }
      )
    }
    const { amount, note } = body as { amount: number; note?: string }
    let userId = typeof body.userId === 'string' ? body.userId : ''

    // Resolve by email when no id was given (or the id field contains an @)
    const emailLike =
      typeof body.email === 'string'
        ? body.email
        : userId.includes('@')
          ? userId
          : null
    if (emailLike) {
      const user = await prisma.user.findFirst({
        where: { email: { equals: emailLike.trim(), mode: 'insensitive' } },
        select: { id: true },
      })
      if (!user) {
        return NextResponse.json({ error: 'user_not_found' }, { status: 404 })
      }
      userId = user.id
    }
    if (!Number.isInteger(amount) || amount === 0) {
      return NextResponse.json(
        { error: 'amount must be a non-zero integer' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: amount } },
        select: { credits: true, email: true },
      })
      const txRow = await tx.creditTransaction.create({
        data: {
          userId,
          delta: amount,
          balanceAfter: updated.credits,
          type:
            amount > 0
              ? CreditTransactionType.ADMIN_GRANT
              : CreditTransactionType.ADMIN_REVOKE,
          metadata: note
            ? { note, by: decoded.userId }
            : { by: decoded.userId },
        },
        select: { id: true },
      })
      return { balance: updated.credits, email: updated.email, txId: txRow.id }
    })

    return NextResponse.json({
      ok: true,
      userId,
      email: result.email,
      delta: amount,
      balance: result.balance,
      transactionId: result.txId,
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 })
    }
    console.error('[admin/credits/grant] error:', error)
    // Admin-only route: surface the underlying cause for diagnosis
    return NextResponse.json(
      {
        error: 'grant_failed',
        code:
          error instanceof Prisma.PrismaClientKnownRequestError
            ? error.code
            : undefined,
        detail: error instanceof Error ? error.message.slice(0, 300) : null,
      },
      { status: 500 }
    )
  }
}

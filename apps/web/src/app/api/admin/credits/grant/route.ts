import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, CreditTransactionType, Prisma } from '@prisma/client'
import { verifyToken } from '@/lib/auth-service'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * POST /api/admin/credits/grant
 * Body: { userId: string, amount: number, note?: string }
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
      typeof body.userId !== 'string' ||
      typeof body.amount !== 'number'
    ) {
      return NextResponse.json(
        {
          error: 'invalid_body',
          expected: { userId: 'string', amount: 'number' },
        },
        { status: 400 }
      )
    }
    const { userId, amount, note } = body as {
      userId: string
      amount: number
      note?: string
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
    return NextResponse.json({ error: 'grant_failed' }, { status: 500 })
  }
}

import { PrismaClient, CreditTransactionType, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export type DebitInput = {
  userId: string
  amount: number
  type: Extract<
    CreditTransactionType,
    'AI_PREDICTION' | 'ML_PREDICTION' | 'ADMIN_REVOKE'
  >
  refId?: string | null
  metadata?: Prisma.InputJsonValue | null
}

export type RefundInput = {
  userId: string
  amount: number
  refId?: string | null
  metadata?: Prisma.InputJsonValue | null
}

export type DebitResult =
  | { ok: true; balance: number; transactionId: number }
  | { ok: false; reason: 'insufficient'; balance: number; required: number }

/**
 * Atomically debit credits from a user. Uses a conditional updateMany so
 * concurrent calls cannot drive the balance negative — if affected row count
 * is 0, the balance was below `amount` at commit time.
 */
export async function debitCredits(input: DebitInput): Promise<DebitResult> {
  const { userId, amount, type, refId, metadata } = input
  if (amount <= 0) {
    throw new Error(`debitCredits called with non-positive amount: ${amount}`)
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: userId, credits: { gte: amount } },
      data: { credits: { decrement: amount } },
    })

    if (updated.count === 0) {
      const current = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      })
      return {
        ok: false as const,
        reason: 'insufficient' as const,
        balance: current?.credits ?? 0,
        required: amount,
      }
    }

    const fresh = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    })
    const balance = fresh?.credits ?? 0

    const txRow = await tx.creditTransaction.create({
      data: {
        userId,
        delta: -amount,
        balanceAfter: balance,
        type,
        refId: refId ?? null,
        metadata: metadata ?? Prisma.JsonNull,
      },
      select: { id: true },
    })

    return { ok: true as const, balance, transactionId: txRow.id }
  })
}

/**
 * Refund credits previously debited (e.g. on Gemini call failure). Always
 * succeeds barring DB error.
 */
export async function refundCredits(
  input: RefundInput
): Promise<{ balance: number; transactionId: number }> {
  const { userId, amount, refId, metadata } = input
  if (amount <= 0) {
    throw new Error(`refundCredits called with non-positive amount: ${amount}`)
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    })
    const txRow = await tx.creditTransaction.create({
      data: {
        userId,
        delta: amount,
        balanceAfter: updated.credits,
        type: CreditTransactionType.REFUND,
        refId: refId ?? null,
        metadata: metadata ?? Prisma.JsonNull,
      },
      select: { id: true },
    })
    return { balance: updated.credits, transactionId: txRow.id }
  })
}

/**
 * Read the current balance for a user. Returns 0 if the user does not exist.
 */
export async function getBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  })
  return user?.credits ?? 0
}

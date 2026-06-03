import { prisma, CreditTransactionType, Prisma } from '@football-ai/database'

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
 * Atomically debit credits. Conditional updateMany guards against negative
 * balance under concurrent calls — if 0 rows match, the user did not have
 * enough credits at commit time.
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

/** Per-prediction cost for ML (Poisson + XGBoost). */
export const ML_PREDICTION_COST = 2

/** Per-call cost for the premium Dixon-Coles + value-bet engine. */
export const DIXON_COLES_COST = 4

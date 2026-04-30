import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { PrismaClient, CreditTransactionType, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Maps a Whop plan/product id to the credit grant. The plan ids are
 * configured per environment because Whop assigns them when the merchant
 * creates the products in their dashboard. Plain USD-based fallback below
 * keeps the webhook safe even if plan ids are not configured yet.
 */
const PLAN_ID_TO_CREDITS: Record<string, number> = {}
function loadPlanMap(): Record<string, number> {
  const map: Record<string, number> = {}
  const starter = process.env.WHOP_PLAN_STARTER_ID
  const standard = process.env.WHOP_PLAN_STANDARD_ID
  const pro = process.env.WHOP_PLAN_PRO_ID
  if (starter) map[starter] = 100
  if (standard) map[standard] = 210
  if (pro) map[pro] = 650
  return map
}
const PRICE_TO_CREDITS: Record<string, number> = {
  '50': 100,
  '50.00': 100,
  '5000': 100, // cents
  '100': 210,
  '100.00': 210,
  '10000': 210,
  '270': 650,
  '270.00': 650,
  '27000': 650,
}

type WhopEvent = {
  id?: string
  event?: string
  type?: string
  data?: any
  [k: string]: unknown
}

/**
 * Verify the request signature. Whop's docs have varied between an HMAC of
 * the raw body and a `t=...,v1=...` Stripe-style header; we accept either by
 * computing the HMAC of the body and checking against any token in the
 * signature header. Reject if the secret is unset to avoid silently
 * accepting unsigned posts in production.
 */
function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHOP_WEBHOOK_SECRET
  if (!secret) {
    console.error('[whop-webhook] WHOP_WEBHOOK_SECRET not set — rejecting')
    return false
  }
  if (!header) return false
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  // Header may be raw hex or "t=...,v1=<hex>". Pull every hex chunk and
  // timing-safe compare each.
  const candidates = header.match(/[a-f0-9]{64}/gi) || [header]
  return candidates.some((c) => {
    if (c.length !== expected.length) return false
    try {
      return crypto.timingSafeEqual(
        Buffer.from(c, 'hex'),
        Buffer.from(expected, 'hex')
      )
    } catch {
      return false
    }
  })
}

function pickFirst(...vals: Array<unknown>): string | null {
  for (const v of vals) {
    if (typeof v === 'string' && v.length > 0) return v
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return null
}

function resolveCredits(event: WhopEvent): {
  credits: number | null
  source: string
  detail: string | null
} {
  const data = event.data as Record<string, unknown> | undefined
  if (!data) return { credits: null, source: 'no-data', detail: null }

  // 1) Plan id mapping — preferred when configured.
  const planMap = Object.keys(PLAN_ID_TO_CREDITS).length
    ? PLAN_ID_TO_CREDITS
    : loadPlanMap()
  const planId = pickFirst(
    (data as any).plan_id,
    (data as any).planId,
    (data as any).product_id,
    (data as any).productId,
    (data as any).plan?.id,
    (data as any).product?.id
  )
  if (planId && planMap[planId] != null) {
    return { credits: planMap[planId], source: 'plan_id', detail: planId }
  }

  // 2) Amount fallback — exact USD or cents match.
  const amount = pickFirst(
    (data as any).amount,
    (data as any).price,
    (data as any).total,
    (data as any).final_amount,
    (data as any).amount_after_discounts
  )
  if (amount && PRICE_TO_CREDITS[amount] != null) {
    return {
      credits: PRICE_TO_CREDITS[amount],
      source: 'amount',
      detail: amount,
    }
  }

  return { credits: null, source: 'unknown', detail: planId ?? amount ?? null }
}

function resolveUserId(event: WhopEvent): string | null {
  const data = event.data as Record<string, unknown> | undefined
  if (!data) return null
  return pickFirst(
    (data as any).metadata?.userId,
    (data as any).user_metadata?.userId,
    (data as any).custom_metadata?.userId,
    (data as any).metadata?.user_id,
    (data as any).user?.metadata?.userId
  )
}

/**
 * POST /api/webhooks/whop
 * Whop posts events here when a credit-package payment succeeds. We grant
 * the corresponding credits to the user (identified via metadata.userId
 * we passed on the checkout URL) and record an idempotent CreditTransaction
 * keyed off the Whop event id, so re-deliveries are no-ops.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const sigHeader =
    request.headers.get('whop-signature') ||
    request.headers.get('x-whop-signature')

  if (!verifySignature(rawBody, sigHeader)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  let event: WhopEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const eventType = (event.event ?? event.type ?? '').toLowerCase()
  // Process completed payments / new memberships only; ignore previews,
  // cancellations, subscription updates, etc.
  const isGrant =
    eventType.includes('payment.succeeded') ||
    eventType.includes('payment_succeeded') ||
    eventType.includes('membership.created') ||
    eventType.includes('membership_created') ||
    eventType.includes('membership_went_valid') ||
    eventType.includes('payment.completed')

  if (!isGrant) {
    return NextResponse.json({ ok: true, ignored: true, eventType })
  }

  const userId = resolveUserId(event)
  if (!userId) {
    console.error('[whop-webhook] missing userId in event metadata', {
      eventId: event.id,
      eventType,
    })
    return NextResponse.json(
      { error: 'missing_user_metadata', eventType },
      { status: 400 }
    )
  }

  const { credits, source, detail } = resolveCredits(event)
  if (!credits) {
    console.error('[whop-webhook] could not resolve credit amount', {
      eventId: event.id,
      eventType,
      source,
      detail,
    })
    return NextResponse.json(
      { error: 'unknown_package', eventType, hint: detail },
      { status: 400 }
    )
  }

  const idempotencyKey = `whop:${event.id ?? `${userId}:${eventType}:${detail}`}`

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: credits } },
        select: { credits: true, email: true },
      })
      const txRow = await tx.creditTransaction.create({
        data: {
          userId,
          delta: credits,
          balanceAfter: updated.credits,
          type: CreditTransactionType.PURCHASE,
          refId: event.id ?? null,
          idempotencyKey,
          metadata: {
            source: 'whop',
            eventType,
            resolvedBy: source,
            detail,
          },
        },
        select: { id: true },
      })
      return { balance: updated.credits, email: updated.email, txId: txRow.id }
    })

    console.log('[whop-webhook] granted credits', {
      userId,
      email: result.email,
      credits,
      newBalance: result.balance,
      txId: result.txId,
      eventId: event.id,
    })
    return NextResponse.json({
      ok: true,
      credited: credits,
      newBalance: result.balance,
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      // Re-delivery of an already-processed event — return 200 so Whop
      // stops retrying.
      console.log('[whop-webhook] duplicate event, no-op', {
        eventId: event.id,
        idempotencyKey,
      })
      return NextResponse.json({ ok: true, duplicate: true })
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      console.error('[whop-webhook] user not found', {
        userId,
        eventId: event.id,
      })
      return NextResponse.json(
        { error: 'user_not_found', userId },
        { status: 404 }
      )
    }
    console.error('[whop-webhook] grant failed', error)
    return NextResponse.json({ error: 'grant_failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    method: 'POST events to this endpoint',
    secretConfigured: !!process.env.WHOP_WEBHOOK_SECRET,
    plansConfigured: {
      starter: !!process.env.WHOP_PLAN_STARTER_ID,
      standard: !!process.env.WHOP_PLAN_STANDARD_ID,
      pro: !!process.env.WHOP_PLAN_PRO_ID,
    },
  })
}

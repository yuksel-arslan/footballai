import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth-service'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

function requireAdmin(
  request: NextRequest
): { ok: true } | { ok: false; res: NextResponse } {
  const token =
    request.cookies.get('auth-token')?.value ||
    (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'unauthenticated' }, { status: 401 }),
    }
  }
  const decoded = verifyToken(token)
  if (!decoded || !decoded.isAdmin) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'admin_required' }, { status: 403 }),
    }
  }
  return { ok: true }
}

/**
 * GET /api/admin/leagues — list all leagues (incl. passive) with their active
 * flag, for the admin activity-control panel. Admin only.
 */
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.res

  try {
    const leagues = await prisma.league.findMany({
      orderBy: [{ active: 'desc' }, { country: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        apiId: true,
        name: true,
        country: true,
        logoUrl: true,
        season: true,
        active: true,
      },
    })
    return NextResponse.json({ success: true, data: leagues })
  } catch (e) {
    // Surface the cause (admin-only route) instead of an opaque 500.
    return NextResponse.json(
      {
        success: false,
        error: 'query_failed',
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/leagues — toggle a league's activity.
 * Body: { id: number, active: boolean }. Admin only.
 */
export async function PATCH(request: NextRequest) {
  const auth = requireAdmin(request)
  if (!auth.ok) return auth.res

  const body = await request.json().catch(() => null)
  if (
    !body ||
    typeof body.id !== 'number' ||
    typeof body.active !== 'boolean'
  ) {
    return NextResponse.json(
      {
        error: 'invalid_body',
        detail: 'expected { id: number, active: boolean }',
      },
      { status: 400 }
    )
  }

  try {
    const updated = await prisma.league.update({
      where: { id: body.id },
      data: { active: body.active },
      select: { id: true, name: true, active: true },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch {
    return NextResponse.json({ error: 'league_not_found' }, { status: 404 })
  }
}

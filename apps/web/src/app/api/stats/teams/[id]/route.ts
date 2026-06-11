import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const teamId = parseInt(id)

    // Try gateway first if configured
    if (GATEWAY_URL) {
      try {
        const res = await fetch(`${GATEWAY_URL}/api/stats/teams/${id}`, {
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(15000),
        })

        if (res.ok) {
          const data = await res.json()
          return NextResponse.json(data, { status: res.status })
        }
      } catch {
        // Gateway unavailable, fall through to direct DB
      }
    }

    // Direct DB fallback
    const currentYear = new Date().getFullYear()
    const stats = await prisma.teamStats.findFirst({
      where: { teamId, season: { in: [currentYear, currentYear - 1] } },
      include: {
        team: { select: { id: true, name: true, logoUrl: true } },
        league: { select: { id: true, name: true, logoUrl: true } },
      },
      orderBy: { season: 'desc' },
    })

    if (!stats) {
      return NextResponse.json(
        { success: false, error: 'Team stats not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error('[Team Stats]', error)
    return NextResponse.json(
      { success: false, error: 'Stats service unavailable' },
      { status: 502 }
    )
  }
}

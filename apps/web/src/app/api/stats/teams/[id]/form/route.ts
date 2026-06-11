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

const PROXY_URL = '/api/football'

async function fetchFormFromApiFootball(
  teamId: number
): Promise<{ form: string[]; matches: any[] } | null> {
  try {
    const now = new Date()
    const season =
      now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear()
    const endpoint = `/fixtures?team=${teamId}&season=${season}&last=5&status=FT-AET-PEN`
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'
    const res = await fetch(
      `${baseUrl}${PROXY_URL}?endpoint=${encodeURIComponent(endpoint)}&source=api-football`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.response?.length) return null

    const form: string[] = []
    const matches = data.response.map((m: any) => {
      const homeScore = m.goals?.home ?? m.score?.fulltime?.home
      const awayScore = m.goals?.away ?? m.score?.fulltime?.away
      const homeId = m.teams?.home?.id
      const isHome = homeId === teamId
      const teamScore = isHome ? homeScore : awayScore
      const oppScore = isHome ? awayScore : homeScore

      if (teamScore != null && oppScore != null) {
        if (teamScore > oppScore) form.push('W')
        else if (teamScore < oppScore) form.push('L')
        else form.push('D')
      } else {
        form.push('-')
      }

      return {
        id: m.fixture?.id,
        homeTeam: {
          id: m.teams?.home?.id,
          name: m.teams?.home?.name,
          logoUrl: m.teams?.home?.logo,
        },
        awayTeam: {
          id: m.teams?.away?.id,
          name: m.teams?.away?.name,
          logoUrl: m.teams?.away?.logo,
        },
        homeScore,
        awayScore,
        matchDate: m.fixture?.date,
        status: 'FINISHED',
        league: {
          id: m.league?.id,
          name: m.league?.name,
        },
      }
    })

    return { form, matches }
  } catch (err) {
    console.warn('[Team Form] API-Football fallback failed:', err)
    return null
  }
}

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
        const res = await fetch(`${GATEWAY_URL}/api/stats/teams/${id}/form`, {
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(15000),
        })

        if (res.ok) {
          const data = await res.json()
          // Only use gateway result if it actually has form data
          if (data?.data?.form?.length > 0 || data?.data?.matches?.length > 0) {
            return NextResponse.json(data, { status: res.status })
          }
        }
      } catch {
        // Gateway unavailable, fall through to direct DB
      }
    }

    // Direct DB fallback - try TeamStats first for cached form
    const currentYear = new Date().getFullYear()
    const teamStats = await prisma.teamStats.findFirst({
      where: { teamId, season: { in: [currentYear, currentYear - 1] } },
      orderBy: { season: 'desc' },
    })

    // Get last 5 finished matches for this team
    const recentMatches = await prisma.fixture.findMany({
      where: {
        status: 'FINISHED',
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      include: {
        homeTeam: {
          select: { id: true, name: true, logoUrl: true, code: true },
        },
        awayTeam: {
          select: { id: true, name: true, logoUrl: true, code: true },
        },
        league: { select: { id: true, name: true } },
      },
      orderBy: { matchDate: 'desc' },
      take: 5,
    })

    // Compute form from recent matches
    let form: string[] = []
    if (teamStats?.lastFiveForm) {
      form = teamStats.lastFiveForm.split('')
    } else if (recentMatches.length > 0) {
      form = recentMatches.map((match) => {
        const isHome = match.homeTeamId === teamId
        const teamScore = isHome ? match.homeScore : match.awayScore
        const oppScore = isHome ? match.awayScore : match.homeScore
        if (teamScore === null || oppScore === null) return '-'
        if (teamScore > oppScore) return 'W'
        if (teamScore < oppScore) return 'L'
        return 'D'
      })
    }

    // If no data from DB, try external API-Football as fallback
    if (form.length === 0 && recentMatches.length === 0) {
      const externalForm = await fetchFormFromApiFootball(teamId)
      if (externalForm) {
        return NextResponse.json({
          success: true,
          data: externalForm,
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: { form, matches: recentMatches },
    })
  } catch (error) {
    console.error('[Team Form]', error)
    return NextResponse.json(
      { success: false, error: 'Stats service unavailable' },
      { status: 502 }
    )
  }
}

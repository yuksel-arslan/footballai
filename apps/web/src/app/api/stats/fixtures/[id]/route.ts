import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/stats/fixtures/[id]
 *
 * Returns match statistics (possession, shots, fouls, corners, cards, etc.)
 * fetched from API-Football /fixtures/statistics endpoint.
 */

function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

interface TeamMatchStats {
  teamId: number
  teamName: string
  teamLogo?: string
  possession?: string
  shotsTotal?: number
  shotsOnTarget?: number
  corners?: number
  fouls?: number
  yellowCards?: number
  redCards?: number
  offsides?: number
  passes?: number
  passAccuracy?: string
  tackles?: number
  interceptions?: number
  saves?: number
  expectedGoals?: string
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const fixtureId = parseInt(id)
    if (isNaN(fixtureId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid fixture ID' },
        { status: 400 }
      )
    }

    // Fetch from API-Football via proxy
    const endpoint = `/fixtures/statistics?fixture=${fixtureId}`
    const res = await fetch(
      `${baseUrl()}/api/football?endpoint=${encodeURIComponent(endpoint)}&source=api-football`,
      { signal: AbortSignal.timeout(10000) }
    )

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: 'Stats service unavailable' },
        { status: 502 }
      )
    }

    const data = await res.json()

    if (!data?.response?.length) {
      return NextResponse.json({
        success: true,
        data: { home: null, away: null },
      })
    }

    // API-Football returns an array with two entries (home & away)
    const stats: TeamMatchStats[] = data.response.map((teamData: any) => {
      const statMap: Record<string, any> = {}
      for (const s of teamData.statistics || []) {
        statMap[s.type] = s.value
      }

      return {
        teamId: teamData.team?.id || 0,
        teamName: teamData.team?.name || 'Unknown',
        teamLogo: teamData.team?.logo,
        possession: statMap['Ball Possession'] || null,
        shotsTotal: toNum(statMap['Total Shots']),
        shotsOnTarget: toNum(statMap['Shots on Goal']),
        corners: toNum(statMap['Corner Kicks']),
        fouls: toNum(statMap['Fouls']),
        yellowCards: toNum(statMap['Yellow Cards']),
        redCards: toNum(statMap['Red Cards']),
        offsides: toNum(statMap['Offsides']),
        passes: toNum(statMap['Total passes']),
        passAccuracy: statMap['Passes %'] || statMap['Pass Accuracy'] || null,
        tackles: toNum(statMap['Tackles']),
        interceptions: toNum(statMap['Interceptions']),
        saves: toNum(statMap['Goalkeeper Saves']),
        expectedGoals: statMap['expected_goals'] || null,
      } satisfies TeamMatchStats
    })

    return NextResponse.json({
      success: true,
      data: {
        home: stats[0] || null,
        away: stats[1] || null,
      },
    })
  } catch (error) {
    console.error('[Fixture Stats]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch match statistics' },
      { status: 500 }
    )
  }
}

function toNum(val: any): number | undefined {
  if (val === null || val === undefined) return undefined
  const n = parseInt(String(val))
  return isNaN(n) ? undefined : n
}

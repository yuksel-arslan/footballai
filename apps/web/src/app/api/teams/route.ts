import { NextRequest, NextResponse } from 'next/server'

const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query || query.length < 2) {
    return NextResponse.json({ data: [] })
  }

  try {
    if (!FOOTBALL_DATA_KEY) {
      return NextResponse.json({ data: [] })
    }

    const res = await fetch(`${FOOTBALL_DATA_BASE}/teams?limit=20`, {
      headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY },
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      return NextResponse.json({ data: [] })
    }

    const data = await res.json()
    const teams = (data.teams || [])
      .filter((t: any) =>
        t.name?.toLowerCase().includes(query.toLowerCase()) ||
        t.shortName?.toLowerCase().includes(query.toLowerCase()) ||
        t.tla?.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 10)
      .map((t: any) => ({
        id: t.id,
        name: t.name,
        logoUrl: t.crest,
        code: t.tla,
        country: t.area?.name,
        league: t.runningCompetitions?.[0]?.name,
      }))

    return NextResponse.json({ data: teams })
  } catch {
    return NextResponse.json({ data: [] })
  }
}

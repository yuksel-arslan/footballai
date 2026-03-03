import { NextRequest, NextResponse } from 'next/server'

// Football-Data.org API
const FOOTBALL_DATA_URL = 'https://api.football-data.org/v4'
const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY || ''

// API-Football
const API_FOOTBALL_URL = 'https://v3.football.api-sports.io'
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || ''

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint')
  const source = searchParams.get('source') || 'football-data'

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 })
  }

  try {
    if (source === 'api-football' && API_FOOTBALL_KEY) {
      const res = await fetch(`${API_FOOTBALL_URL}${endpoint}`, {
        headers: {
          'x-apisports-key': API_FOOTBALL_KEY,
        },
        next: { revalidate: 60 },
      })

      if (!res.ok) {
        return NextResponse.json(
          { error: `API-Football Error: ${res.status}` },
          { status: res.status }
        )
      }

      const data = await res.json()
      return NextResponse.json(data)
    }

    // Default: Football-Data.org
    if (!FOOTBALL_DATA_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    const res = await fetch(`${FOOTBALL_DATA_URL}${endpoint}`, {
      headers: {
        'X-Auth-Token': FOOTBALL_DATA_KEY,
      },
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      if (res.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded', rateLimited: true },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: `Football-Data API Error: ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Proxy fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from API' },
      { status: 500 }
    )
  }
}

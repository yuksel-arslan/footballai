import { NextRequest, NextResponse } from 'next/server'

// Football-Data.org API
const FOOTBALL_DATA_URL = 'https://api.football-data.org/v4'
const FOOTBALL_DATA_KEY =
  process.env.FOOTBALL_DATA_KEY ||
  process.env.NEXT_PUBLIC_FOOTBALL_DATA_KEY ||
  ''

// API-Football (supports both api-sports.io and RapidAPI)
const RAPIDAPI_KEY =
  process.env.RAPIDAPI_KEY || process.env.NEXT_PUBLIC_RAPIDAPI_KEY || ''
const API_FOOTBALL_KEY =
  process.env.API_FOOTBALL_KEY || process.env.NEXT_PUBLIC_API_FOOTBALL_KEY || ''

// Use RapidAPI if its key is set, otherwise fall back to api-sports.io
const useRapidApi = !!RAPIDAPI_KEY
const API_FOOTBALL_URL = useRapidApi
  ? 'https://api-football-v1.p.rapidapi.com/v3'
  : 'https://v3.football.api-sports.io'
const API_FOOTBALL_ACTIVE_KEY = useRapidApi ? RAPIDAPI_KEY : API_FOOTBALL_KEY

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint')
  const source = searchParams.get('source') || 'football-data'

  if (!endpoint) {
    return NextResponse.json(
      { error: 'Missing endpoint parameter' },
      { status: 400 }
    )
  }

  try {
    // API-Football source
    if (source === 'api-football') {
      if (!API_FOOTBALL_ACTIVE_KEY) {
        return NextResponse.json(
          { error: 'API-Football key not configured', noKey: true },
          { status: 404 }
        )
      }

      const headers: Record<string, string> = useRapidApi
        ? {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
          }
        : { 'x-apisports-key': API_FOOTBALL_KEY }

      const res = await fetch(`${API_FOOTBALL_URL}${endpoint}`, {
        headers,
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
        { error: 'API key not configured', noKey: true },
        { status: 404 }
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

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-service'
import { getPredictionComparison, getFixtureByApiId } from '@/lib/db-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fixtureId = parseInt(searchParams.get('fixtureId') || '0')

    if (!fixtureId) {
      return NextResponse.json(
        { success: false, error: 'fixtureId required' },
        { status: 400 }
      )
    }

    let userId: string | undefined
    const token = request.cookies.get('auth-token')?.value
    if (token) {
      const decoded = verifyToken(token)
      if (decoded) userId = decoded.userId
    }

    // Resolve external API ID to DB ID
    const dbFixture = await getFixtureByApiId(fixtureId)
    const dbFixtureId = dbFixture?.id ?? fixtureId

    const result = await getPredictionComparison(dbFixtureId, userId)
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Fixture not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Prediction comparison error:', error)
    return NextResponse.json(
      { success: false, error: 'Service unavailable' },
      { status: 500 }
    )
  }
}

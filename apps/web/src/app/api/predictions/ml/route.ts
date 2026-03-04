import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'
import { generatePrediction, type MatchData } from '@/lib/gemini'
import { notifyPrediction } from '@/lib/telegram'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Try gateway first if configured
    if (GATEWAY_URL) {
      try {
        const res = await fetch(`${GATEWAY_URL}/api/predictions/ml`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        })

        if (res.ok) {
          const data = await res.json()
          return NextResponse.json(data, { status: res.status })
        }
      } catch {
        // Gateway unavailable, fall through to direct AI
      }
    }

    // Direct AI fallback
    const { homeTeam, awayTeam, league } = body

    if (!homeTeam || !awayTeam) {
      return NextResponse.json(
        { success: false, error: 'homeTeam and awayTeam are required' },
        { status: 400 }
      )
    }

    const matchData: MatchData = {
      homeTeam,
      awayTeam,
      league: league || 'Unknown League',
      homeForm: body.homeForm,
      awayForm: body.awayForm,
      homePosition: body.homePosition,
      awayPosition: body.awayPosition,
      h2hResults: body.h2hResults,
    }

    const prediction = await generatePrediction(matchData)

    // Send Telegram notification (non-blocking)
    if (prediction) {
      notifyPrediction({
        homeTeam: matchData.homeTeam,
        awayTeam: matchData.awayTeam,
        league: matchData.league,
        homeWinProb: prediction.homeWinProb,
        drawProb: prediction.drawProb,
        awayWinProb: prediction.awayWinProb,
        confidence: prediction.confidence,
        analysis: prediction.analysis,
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      prediction,
      source: 'direct-ai',
    })
  } catch (error) {
    console.error('[ML Prediction]', error)
    return NextResponse.json(
      { success: false, error: 'ML service unavailable' },
      { status: 502 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { generatePrediction, type MatchData } from '@/lib/gemini'
import { AI_MODELS, getAISettings } from '@/lib/ai-config'

// Simple in-memory cache
const cache = new Map<string, { prediction: any; timestamp: number }>()

function getCacheKey(match: MatchData): string {
  return `${match.homeTeam}-${match.awayTeam}-${match.league}`
}

function getFromCache(key: string, maxAgeMinutes: number): any | null {
  const cached = cache.get(key)
  if (!cached) return null

  const ageMs = Date.now() - cached.timestamp
  if (ageMs > maxAgeMinutes * 60 * 1000) {
    cache.delete(key)
    return null
  }

  return cached.prediction
}

function setCache(key: string, prediction: any): void {
  cache.set(key, { prediction, timestamp: Date.now() })

  // Clean old entries if cache is too large
  if (cache.size > 1000) {
    const entries = Array.from(cache.entries())
    entries.slice(0, 500).forEach(([k]) => cache.delete(k))
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const settings = getAISettings()

    // Single match prediction
    if (body.match) {
      const match = body.match as MatchData
      const cacheKey = getCacheKey(match)

      // Check cache
      if (settings.cacheEnabled) {
        const cached = getFromCache(cacheKey, settings.cacheDurationMinutes)
        if (cached) {
          return NextResponse.json({ prediction: cached, cached: true })
        }
      }

      // Generate prediction
      const prediction = await generatePrediction(match)

      if (prediction && settings.cacheEnabled) {
        setCache(cacheKey, prediction)
      }

      return NextResponse.json({ prediction, cached: false })
    }

    // Batch predictions
    if (body.matches && Array.isArray(body.matches)) {
      const matches = body.matches as MatchData[]
      const results: { match: MatchData; prediction: any; cached: boolean }[] = []

      for (const match of matches) {
        const cacheKey = getCacheKey(match)
        let prediction = settings.cacheEnabled
          ? getFromCache(cacheKey, settings.cacheDurationMinutes)
          : null
        let cached = !!prediction

        if (!prediction) {
          prediction = await generatePrediction(match)
          if (prediction && settings.cacheEnabled) {
            setCache(cacheKey, prediction)
          }
        }

        results.push({ match, prediction, cached })
      }

      return NextResponse.json({ predictions: results })
    }

    return NextResponse.json(
      { error: 'Invalid request. Provide "match" or "matches" in body.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Prediction API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate prediction' },
      { status: 500 }
    )
  }
}

// GET endpoint to check available models and current settings
export async function GET() {
  const settings = getAISettings()
  const selectedModel = AI_MODELS.find(m => m.id === settings.selectedModel)

  // Check which providers are configured
  const providers = {
    gemini: !!(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY),
    openai: !!(process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY),
    anthropic: !!(process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY),
    local: true,
  }

  const availableModels = AI_MODELS.filter(model => providers[model.provider])

  return NextResponse.json({
    settings,
    selectedModel,
    availableModels,
    providers,
    cacheSize: cache.size,
  })
}

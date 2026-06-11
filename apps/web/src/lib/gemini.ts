import {
  getSelectedModel,
  getAISettings,
  resolveModelForTask,
  type AIModel,
} from './ai-config'
import { generateText } from './ai-providers'

// Module-level last-failure cache so /api/predict can surface the upstream
// provider error (model unavailable, quota exceeded, parse failure) in the 502
// response instead of a generic message. Read+cleared by the route per call.
let lastPredictionError: string | null = null
export function consumeLastPredictionError(): string | null {
  const e = lastPredictionError
  lastPredictionError = null
  return e
}

/** Competition type affects team motivation and squad rotation */
export type CompetitionType =
  | 'domestic_league'
  | 'champions_league'
  | 'europa_league'
  | 'domestic_cup'
  | 'international'
  | 'friendly'

export interface MatchData {
  homeTeam: string
  awayTeam: string
  league: string
  competitionType?: CompetitionType
  round?: string // e.g. "Quarter-final", "Matchday 28", "Group Stage"
  homeForm?: string[] // Last 5 results: W, D, L
  awayForm?: string[]
  homePosition?: number
  awayPosition?: number
  h2hResults?: string[] // Last head-to-head results
  homeStats?: {
    wins: number
    draws: number
    losses: number
    goalsFor: number
    goalsAgainst: number
  }
  awayStats?: {
    wins: number
    draws: number
    losses: number
    goalsFor: number
    goalsAgainst: number
  }
  /** RAG-enriched context (injuries, news) – injected server-side */
  ragContext?: string
  // Live match data
  matchStatus?: string
  minute?: number | null
  currentHomeScore?: number | null
  currentAwayScore?: number | null
}

/**
 * Detect competition type from league name.
 */
export function detectCompetitionType(leagueName: string): CompetitionType {
  const name = leagueName.toLowerCase()
  if (name.includes('champions league') || name.includes('şampiyonlar ligi'))
    return 'champions_league'
  if (
    name.includes('europa league') ||
    name.includes('conference league') ||
    name.includes('avrupa ligi')
  )
    return 'europa_league'
  if (
    name.includes('cup') ||
    name.includes('kupa') ||
    name.includes('copa') ||
    name.includes('coupe') ||
    name.includes('pokal') ||
    name.includes('coppa')
  )
    return 'domestic_cup'
  if (
    name.includes('nations league') ||
    name.includes('euro 202') ||
    name.includes('world cup') ||
    name.includes('dünya kupası') ||
    name.includes('qualification')
  )
    return 'international'
  if (name.includes('friendly') || name.includes('hazırlık')) return 'friendly'
  return 'domestic_league'
}

export interface AIPrediction {
  homeWinProb: number
  drawProb: number
  awayWinProb: number
  predictedHomeScore: number
  predictedAwayScore: number
  confidence: number
  analysis: string
  keyFactors: string[]
  model: string // Which model generated this
}

const PREDICTION_PROMPT = `You are an expert football analyst. Analyze the following match and provide a prediction.

Match: {homeTeam} vs {awayTeam}
League: {league}
{competitionContext}
{liveMatchContext}
{additionalInfo}
{ragContext}

IMPORTANT CONTEXT - Competition type affects team motivation and squad selection:
- Champions League / Europa League knockout stages: Very high motivation, strongest squads
- Champions League / Europa League group stages: High motivation but possible rotation if already qualified
- Domestic league: Standard motivation, but increases near season end for title/relegation
- Domestic cup early rounds: Big teams often rotate, potential for upsets
- International friendlies: Low motivation, heavy rotation

Factor the competition type and round into your prediction accordingly.
{liveMatchInstructions}

Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation outside JSON):
{
  "homeWinProb": <number between 0 and 1>,
  "drawProb": <number between 0 and 1>,
  "awayWinProb": <number between 0 and 1>,
  "predictedHomeScore": <integer 0-5>,
  "predictedAwayScore": <integer 0-5>,
  "confidence": <number between 0.5 and 0.95>,
  "analysis": "<1-2 cümlelik kısa analiz, TÜRKÇE>",
  "keyFactors": ["<faktör1>", "<faktör2>", "<faktör3>"]
}

IMPORTANT: homeWinProb + drawProb + awayWinProb MUST equal 1.0
IMPORTANT: "analysis" ve "keyFactors" alanlarını MUTLAKA Türkçe yaz.`

function buildCompetitionContext(match: MatchData): string {
  const compType = match.competitionType || detectCompetitionType(match.league)
  const labels: Record<CompetitionType, string> = {
    champions_league:
      'Champions League (international club tournament – very high prestige)',
    europa_league:
      'Europa League / Conference League (international club tournament)',
    domestic_league: 'Domestic league match (standard season competition)',
    domestic_cup: 'Domestic cup match (knockout – big teams may rotate)',
    international: 'International match (national teams)',
    friendly: 'Friendly match (low stakes – heavy rotation expected)',
  }
  let ctx = `Competition type: ${labels[compType]}`
  if (match.round) {
    ctx += `\nRound / Stage: ${match.round}`
  }
  return ctx
}

function buildLiveMatchContext(match: MatchData): string {
  const isLive =
    match.matchStatus === 'LIVE' || match.matchStatus === 'HALFTIME'
  if (!isLive) return ''

  const minute = match.minute ?? '?'
  const homeScore = match.currentHomeScore ?? 0
  const awayScore = match.currentAwayScore ?? 0
  const halfStatus = match.matchStatus === 'HALFTIME' ? ' (Half Time)' : ''

  return `
⚡ LIVE MATCH STATUS:
- Current Score: ${match.homeTeam} ${homeScore} - ${awayScore} ${match.awayTeam}
- Match Minute: ${minute}'${halfStatus}
- The match is currently IN PROGRESS`
}

function buildLiveMatchInstructions(match: MatchData): string {
  const isLive =
    match.matchStatus === 'LIVE' || match.matchStatus === 'HALFTIME'
  if (!isLive) return ''

  return `
CRITICAL - THIS IS A LIVE MATCH:
- The match is currently being played. Your prediction must account for the CURRENT SCORE and time elapsed.
- The predictedHomeScore and predictedAwayScore should be the FINAL score prediction (not additional goals).
- The final score must be >= the current score for each team.
- Adjust probabilities based on the current scoreline and remaining time.
- A team that is leading late in the match has a much higher probability of winning.
- Factor in match momentum: a team that just scored may have higher momentum.`
}

function buildPrompt(match: MatchData): string {
  let additionalInfo = ''
  if (match.homeForm?.length) {
    additionalInfo += `Home team recent form: ${match.homeForm.join(', ')}\n`
  }
  if (match.awayForm?.length) {
    additionalInfo += `Away team recent form: ${match.awayForm.join(', ')}\n`
  }
  if (match.homePosition) {
    additionalInfo += `Home team league position: ${match.homePosition}\n`
  }
  if (match.awayPosition) {
    additionalInfo += `Away team league position: ${match.awayPosition}\n`
  }
  if (match.h2hResults?.length) {
    additionalInfo += `Recent head-to-head: ${match.h2hResults.join(', ')}\n`
  }
  if (match.homeStats) {
    const s = match.homeStats
    additionalInfo += `Home team season stats: ${s.wins}W ${s.draws}D ${s.losses}L, ${s.goalsFor} goals scored, ${s.goalsAgainst} conceded\n`
  }
  if (match.awayStats) {
    const s = match.awayStats
    additionalInfo += `Away team season stats: ${s.wins}W ${s.draws}D ${s.losses}L, ${s.goalsFor} goals scored, ${s.goalsAgainst} conceded\n`
  }

  return PREDICTION_PROMPT.replace('{homeTeam}', match.homeTeam)
    .replace('{awayTeam}', match.awayTeam)
    .replace('{league}', match.league)
    .replace('{competitionContext}', buildCompetitionContext(match))
    .replace('{liveMatchContext}', buildLiveMatchContext(match))
    .replace('{liveMatchInstructions}', buildLiveMatchInstructions(match))
    .replace(
      '{additionalInfo}',
      additionalInfo || 'No additional statistics available.'
    )
    .replace(
      '{ragContext}',
      match.ragContext
        ? `\n--- ADDITIONAL INTELLIGENCE (from recent data) ---\n${match.ragContext}`
        : ''
    )
}

function parseResponse(text: string, modelId: string): AIPrediction | null {
  try {
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in AI response:', text)
      lastPredictionError = `parseResponse: no JSON in model output (first 200 chars: ${text.slice(0, 200)})`
      return null
    }

    const prediction = JSON.parse(jsonMatch[0]) as AIPrediction
    prediction.model = modelId

    // Validate probabilities sum to 1
    const total =
      prediction.homeWinProb + prediction.drawProb + prediction.awayWinProb
    if (Math.abs(total - 1) > 0.05) {
      // Normalize if not close to 1
      prediction.homeWinProb = prediction.homeWinProb / total
      prediction.drawProb = prediction.drawProb / total
      prediction.awayWinProb = prediction.awayWinProb / total
    }

    return prediction
  } catch (error: any) {
    console.error('Failed to parse AI response:', error)
    lastPredictionError = `parseResponse threw: ${error?.message ?? String(error)}`
    return null
  }
}

// Generate prediction with any configured provider (Gemini or Claude)
async function generateModelPrediction(
  match: MatchData,
  model: AIModel
): Promise<AIPrediction | null> {
  try {
    const prompt = buildPrompt(match)
    const text = await generateText(model, prompt)
    return parseResponse(text, model.id)
  } catch (error: any) {
    console.error(`${model.provider} prediction error:`, error)
    lastPredictionError = `${model.provider} call failed (model=${model.id}): ${error?.message ?? String(error)}`
    return null
  }
}

// Main prediction function — multi-provider with cross-provider fallback
export async function generatePrediction(
  match: MatchData,
  modelOverride?: AIModel
): Promise<AIPrediction | null> {
  const model = modelOverride || getSelectedModel()
  const settings = getAISettings()

  if (!settings.enablePredictions) {
    return null
  }

  const prediction = await generateModelPrediction(match, model)
  if (prediction) return prediction
  console.warn(`AI prediction failed for model ${model.id}`)

  // The chosen model failed (quota, outage). If another provider is
  // configured, retry once with the best model from the other provider so
  // a single-provider incident doesn't take predictions down.
  const primaryError = lastPredictionError
  const fallback = resolveModelForTask('prediction', model.provider)
  if (fallback) {
    const retry = await generateModelPrediction(match, fallback)
    if (retry) return retry
    lastPredictionError = `${primaryError} | fallback: ${lastPredictionError}`
  } else {
    lastPredictionError = primaryError
  }

  return null
}

// Batch prediction for multiple matches
export async function generateBatchPredictions(
  matches: MatchData[]
): Promise<Map<string, AIPrediction>> {
  const results = new Map<string, AIPrediction>()
  const settings = getAISettings()
  const batchSize = Math.min(5, settings.maxRequestsPerMinute / 10)

  for (let i = 0; i < matches.length; i += batchSize) {
    const batch = matches.slice(i, i + batchSize)
    const predictions = await Promise.all(
      batch.map(async (match) => {
        const key = `${match.homeTeam}-${match.awayTeam}`
        const prediction = await generatePrediction(match)
        return { key, prediction }
      })
    )

    predictions.forEach(({ key, prediction }) => {
      if (prediction) {
        results.set(key, prediction)
      }
    })

    // Small delay between batches to respect rate limits
    if (i + batchSize < matches.length) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  return results
}

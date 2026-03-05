import { getSelectedModel, getAISettings, type AIModel } from './ai-config'

// Lazy load providers to avoid import errors if packages not installed
let GoogleGenerativeAI: any = null

async function loadGemini() {
  if (!GoogleGenerativeAI) {
    try {
      const mod = await import('@google/generative-ai')
      GoogleGenerativeAI = mod.GoogleGenerativeAI
    } catch {
      console.warn('Google Generative AI package not installed')
    }
  }
  return GoogleGenerativeAI
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
{additionalInfo}
{ragContext}

IMPORTANT CONTEXT - Competition type affects team motivation and squad selection:
- Champions League / Europa League knockout stages: Very high motivation, strongest squads
- Champions League / Europa League group stages: High motivation but possible rotation if already qualified
- Domestic league: Standard motivation, but increases near season end for title/relegation
- Domestic cup early rounds: Big teams often rotate, potential for upsets
- International friendlies: Low motivation, heavy rotation

Factor the competition type and round into your prediction accordingly.

Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation outside JSON):
{
  "homeWinProb": <number between 0 and 1>,
  "drawProb": <number between 0 and 1>,
  "awayWinProb": <number between 0 and 1>,
  "predictedHomeScore": <integer 0-5>,
  "predictedAwayScore": <integer 0-5>,
  "confidence": <number between 0.5 and 0.95>,
  "analysis": "<brief 1-2 sentence analysis in the same language as the league>",
  "keyFactors": ["<factor1>", "<factor2>", "<factor3>"]
}

IMPORTANT: homeWinProb + drawProb + awayWinProb MUST equal 1.0`

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
  } catch (error) {
    console.error('Failed to parse AI response:', error)
    return null
  }
}

// Generate prediction using Gemini
async function generateGeminiPrediction(
  match: MatchData,
  modelId: string
): Promise<AIPrediction | null> {
  const GenAI = await loadGemini()
  if (!GenAI) return null

  const apiKey =
    process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) {
    console.warn('Gemini API key not configured')
    return null
  }

  try {
    const genAI = new GenAI(apiKey)
    const model = genAI.getGenerativeModel({ model: modelId })
    const prompt = buildPrompt(match)

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return parseResponse(text, modelId)
  } catch (error) {
    console.error('Gemini prediction error:', error)
    return null
  }
}

// Generate prediction using OpenAI
async function generateOpenAIPrediction(
  match: MatchData,
  modelId: string
): Promise<AIPrediction | null> {
  const apiKey =
    process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY
  if (!apiKey) {
    console.warn('OpenAI API key not configured')
    return null
  }

  try {
    const prompt = buildPrompt(match)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''

    return parseResponse(text, modelId)
  } catch (error) {
    console.error('OpenAI prediction error:', error)
    return null
  }
}

// Generate prediction using Anthropic
async function generateAnthropicPrediction(
  match: MatchData,
  modelId: string
): Promise<AIPrediction | null> {
  const apiKey =
    process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('Anthropic API key not configured')
    return null
  }

  try {
    const prompt = buildPrompt(match)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    return parseResponse(text, modelId)
  } catch (error) {
    console.error('Anthropic prediction error:', error)
    return null
  }
}

// Main prediction function - uses configured model
export async function generatePrediction(
  match: MatchData,
  modelOverride?: AIModel
): Promise<AIPrediction | null> {
  const model = modelOverride || getSelectedModel()
  const settings = getAISettings()

  if (!settings.enablePredictions) {
    return null
  }

  let prediction: AIPrediction | null = null

  switch (model.provider) {
    case 'gemini':
      prediction = await generateGeminiPrediction(match, model.id)
      break
    case 'openai':
      prediction = await generateOpenAIPrediction(match, model.id)
      break
    case 'anthropic':
      prediction = await generateAnthropicPrediction(match, model.id)
      break
    default:
      console.warn(`No AI provider configured for: ${model.provider}`)
      return null
  }

  if (!prediction) {
    console.warn(`${model.provider} prediction failed`)
  }

  return prediction
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

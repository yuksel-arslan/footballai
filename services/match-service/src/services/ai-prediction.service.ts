import { GoogleGenerativeAI } from '@google/generative-ai'
import { PrismaClient } from '@football-ai/database'
import { config } from '../config'
import {
  aiResponseSchema,
  type AIPredictionResponse,
  type PredictionData,
} from '../types/prediction.types'

const prisma = new PrismaClient()

class AIPredictionService {
  private genAI: GoogleGenerativeAI
  private model: any

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.ai.geminiApiKey)
    this.model = this.genAI.getGenerativeModel({
      model: config.ai.geminiModel,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2, // More deterministic
      },
    })
  }

  /**
   * Generate AI prediction for a fixture
   */
  async generatePrediction(fixtureId: number): Promise<PredictionData> {
    // Check if prediction already exists
    const existingPrediction = await prisma.prediction.findFirst({
      where: { fixtureId },
    })

    if (existingPrediction) {
      return existingPrediction
    }

    // Fetch fixture data
    const fixture = await prisma.fixture.findUnique({
      where: { id: fixtureId },
      include: {
        homeTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        awayTeam: {
          select: {
            id: true,
            name: true,
          },
        },
        league: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!fixture) {
      throw new Error('Maç bulunamadı')
    }

    // Build prompt
    const prompt = this.buildPrompt(fixture)

    // Call Gemini AI
    const result = await this.model.generateContent(prompt)
    const responseText = result.response.text()

    // Parse and validate response
    let aiResponse: AIPredictionResponse
    try {
      const parsed = JSON.parse(responseText)
      aiResponse = aiResponseSchema.parse(parsed)
    } catch (error) {
      throw new Error(
        `AI yanıtı geçersiz: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    // Save to database
    const prediction = await prisma.prediction.create({
      data: {
        fixtureId,
        modelVersion: config.ai.geminiModel,
        homeWinProb: aiResponse.homeWinProb,
        drawProb: aiResponse.drawProb,
        awayWinProb: aiResponse.awayWinProb,
        predictedHomeScore: aiResponse.predictedHomeScore,
        predictedAwayScore: aiResponse.predictedAwayScore,
        confidence: aiResponse.confidence,
        explanation: aiResponse.explanation,
        keyFactors: aiResponse.keyFactors,
        features: {},
      },
    })

    return prediction
  }

  /**
   * Build AI prompt with fixture data
   */
  private buildPrompt(fixture: any): string {
    return `
Sen dünyanın en iyi futbol analisti ve veri bilimcisisin. Aşağıdaki verilere dayanarak maç sonucu tahmini yap.

MAÇ: ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}
LİG: ${fixture.league.name}
TARİH: ${fixture.date}

GÖREV:
1. Kazanma olasılıklarını hesapla (toplam %100 olmalı).
2. En olası skor tahminini yap.
3. Bu tahmini yaparken takımların genel güçlerini ve lig durumunu profesyonelce yorumla.
4. Çıktıyı SADECE aşağıdaki JSON formatında ver:

{
  "homeWinProb": number,      // 0-100 integer
  "drawProb": number,         // 0-100 integer
  "awayWinProb": number,      // 0-100 integer
  "predictedHomeScore": number, // 0-9 integer
  "predictedAwayScore": number, // 0-9 integer
  "confidence": number,       // 0-1 float
  "explanation": "Türkçe detaylı analiz metni (min 30 karakter)",
  "keyFactors": ["faktör 1", "faktör 2", "faktör 3"]  // max 5
}

ÖNEMLİ: Sadece JSON formatında yanıt ver. Başka hiçbir metin ekleme.
`.trim()
  }

  /**
   * Estimate fair decimal 1X2 odds for a match when the bookmaker market
   * isn't posted yet (tournaments / far-off fixtures). Used as a fallback so
   * users don't have to type odds by hand. Returns decimal odds (>1) or null.
   * NOTE: these are an AI estimate of a fair market, not a real bookmaker
   * line — value computed against them is indicative, not true market value.
   */
  async estimateOdds(match: {
    home: string
    away: string
    league?: string
  }): Promise<{ home: number; draw: number; away: number } | null> {
    const prompt = `
Sen profesyonel bir futbol oran analistisin. Aşağıdaki maç için adil (vigsiz)
1X2 ondalık bahis oranlarını tahmin et.

MAÇ: ${match.home} vs ${match.away}
${match.league ? `TURNUVA: ${match.league}` : ''}

Kurallar:
- Ondalık oran formatı (ör. 2.10). Her oran 1.01 ile 15.0 arasında olmalı.
- 1/home, X/draw, 2/away üç sonucun ima ettiği olasılıklar toplamı ~%100 olmalı
  (adil/vigsiz oran). 1/oran = ima edilen olasılık.
- Takımların gücüne göre gerçekçi ol.
- SADECE şu JSON: {"home": number, "draw": number, "away": number}
`.trim()

    try {
      const result = await this.model.generateContent(prompt)
      const text = result.response.text()
      const parsed = JSON.parse(text)
      const h = Number(parsed.home)
      const d = Number(parsed.draw)
      const a = Number(parsed.away)
      const valid = [h, d, a].every((n) => Number.isFinite(n) && n > 1)
      if (!valid) return null
      return { home: h, draw: d, away: a }
    } catch {
      return null
    }
  }

  /**
   * Post-match narrative for the auto-generated match report. Returns a short
   * Turkish analysis plus takeaways for each team — the takeaways are what
   * future predictions consume as context. Null on AI failure (the report
   * service falls back to a deterministic summary).
   */
  async summarizeFinishedMatch(input: {
    home: string
    away: string
    homeScore: number
    awayScore: number
    league: string
    predictionNote?: string
  }): Promise<{ summary: string; takeaways: string[] } | null> {
    const prompt = `
Sen profesyonel bir futbol analistisin. Aşağıdaki BİTMİŞ maçın kısa bir maç
sonu değerlendirmesini yaz.

MAÇ: ${input.home} ${input.homeScore} - ${input.awayScore} ${input.away}
TURNUVA: ${input.league}
${input.predictionNote ? `MODEL TAHMİNİ: ${input.predictionNote}` : ''}

Kurallar:
- Türkçe yaz.
- "summary": 2-4 cümlelik maç sonu değerlendirmesi (sonucun anlamı, galibin
  hak edip etmediği skor bazında, varsa model tahmini isabeti).
- "takeaways": her iki takım için gelecek maçlara taşınacak 2-4 kısa çıkarım
  (ör. "X hücumda etkili, 3 gol attı", "Y savunmada kırılgan").
- SADECE şu JSON: {"summary": string, "takeaways": [string, ...]}
`.trim()

    try {
      const result = await this.model.generateContent(prompt)
      const parsed = JSON.parse(result.response.text())
      const summary = typeof parsed.summary === 'string' ? parsed.summary : ''
      const takeaways = Array.isArray(parsed.takeaways)
        ? parsed.takeaways.filter((t: unknown) => typeof t === 'string').slice(0, 6)
        : []
      if (summary.length < 20) return null
      return { summary, takeaways }
    } catch {
      return null
    }
  }
}

export const aiPredictionService = new AIPredictionService()

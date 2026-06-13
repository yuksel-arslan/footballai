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

    // Build prompt with analytical context: recent form, H2H and — crucially —
    // the LESSONS (takeaways) mined from each team's previous post-match
    // reports, so every new prediction learns from prior results.
    const context = await this.buildContext(fixture)
    const prompt = this.buildPrompt(fixture, context)

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
   * Assemble analytical context for a pre-match prediction: each side's last-5
   * form, the head-to-head record, and the LESSONS (takeaways) from their
   * recent post-match reports. Read directly from the DB (no dependency on
   * report.service — avoids a circular import). Best-effort: any piece that
   * fails is simply omitted.
   */
  private async buildContext(fixture: any): Promise<string> {
    const home: string = fixture.homeTeam.name
    const away: string = fixture.awayTeam.name
    const before: Date = fixture.matchDate ?? new Date()

    const formLine = async (name: string): Promise<string> => {
      const rows = await prisma.fixture.findMany({
        where: {
          status: 'FINISHED',
          homeScore: { not: null },
          awayScore: { not: null },
          matchDate: { lt: before },
          OR: [
            { homeTeam: { name: { equals: name, mode: 'insensitive' } } },
            { awayTeam: { name: { equals: name, mode: 'insensitive' } } },
          ],
        },
        orderBy: { matchDate: 'desc' },
        take: 5,
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
        },
      })
      const lc = name.toLowerCase()
      const seq = rows
        .map((f) => {
          const isHome = f.homeTeam.name.toLowerCase() === lc
          const gf = isHome ? f.homeScore! : f.awayScore!
          const ga = isHome ? f.awayScore! : f.homeScore!
          return gf > ga ? 'G' : gf < ga ? 'M' : 'B'
        })
        .join('')
      return seq || '—'
    }

    const h2hLine = async (): Promise<string | null> => {
      const rows = await prisma.fixture.findMany({
        where: {
          status: 'FINISHED',
          homeScore: { not: null },
          awayScore: { not: null },
          OR: [
            {
              homeTeam: { name: { equals: home, mode: 'insensitive' } },
              awayTeam: { name: { equals: away, mode: 'insensitive' } },
            },
            {
              homeTeam: { name: { equals: away, mode: 'insensitive' } },
              awayTeam: { name: { equals: home, mode: 'insensitive' } },
            },
          ],
        },
        include: { homeTeam: { select: { name: true } } },
      })
      if (rows.length === 0) return null
      let hw = 0
      let d = 0
      let aw = 0
      const homeLc = home.toLowerCase()
      for (const f of rows) {
        if (f.homeScore === f.awayScore) d++
        else {
          const rowHomeWon = f.homeScore! > f.awayScore!
          const rowHomeIsHome = f.homeTeam.name.toLowerCase() === homeLc
          rowHomeWon === rowHomeIsHome ? hw++ : aw++
        }
      }
      return `Aralarındaki maçlar: ${home} ${hw} galibiyet, ${d} beraberlik, ${away} ${aw} galibiyet (${rows.length} maç)`
    }

    const lessons = async (name: string): Promise<string[]> => {
      try {
        const reps = await prisma.matchReport.findMany({
          where: {
            fixture: {
              OR: [
                { homeTeam: { name: { equals: name, mode: 'insensitive' } } },
                { awayTeam: { name: { equals: name, mode: 'insensitive' } } },
              ],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { data: true },
        })
        const out: string[] = []
        for (const r of reps) {
          const t = (r.data as { takeaways?: unknown })?.takeaways
          if (Array.isArray(t))
            out.push(...t.filter((x): x is string => typeof x === 'string'))
        }
        return out.slice(0, 6)
      } catch {
        return []
      }
    }

    const [hForm, aForm, h2h, hLes, aLes] = await Promise.all([
      formLine(home),
      formLine(away),
      h2hLine(),
      lessons(home),
      lessons(away),
    ])

    const parts: string[] = [
      `Son 5 form (yeni→eski): ${home} ${hForm}, ${away} ${aForm}`,
    ]
    if (h2h) parts.push(h2h)
    if (hLes.length)
      parts.push(`${home} — geçmiş derslerden:\n- ${hLes.join('\n- ')}`)
    if (aLes.length)
      parts.push(`${away} — geçmiş derslerden:\n- ${aLes.join('\n- ')}`)
    return parts.join('\n')
  }

  /**
   * Build AI prompt with fixture data + analytical context (form, H2H,
   * lessons from prior reports).
   */
  private buildPrompt(fixture: any, context = ''): string {
    const date =
      fixture.matchDate instanceof Date
        ? fixture.matchDate.toISOString().slice(0, 10)
        : (fixture.matchDate ?? fixture.date ?? '')
    return `
Sen dünyanın en iyi futbol analisti ve veri bilimcisisin. Aşağıdaki verilere dayanarak maç sonucu tahmini yap.

MAÇ: ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}
LİG: ${fixture.league.name}
TARİH: ${date}
${context ? `\nANALİTİK BAĞLAM (gerçek verilerden — geçmiş derslere atıf yap):\n${context}\n` : ''}
GÖREV:
1. Kazanma olasılıklarını hesapla (toplam %100 olmalı).
2. En olası skor tahminini yap.
3. Bu tahmini yaparken takımların güncel formunu, aralarındaki maçları ve VERİLEN GEÇMİŞ DERSLERİ profesyonelce yorumla.
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
    /** Analytical context: pre-match form, last-10 stats, H2H, key events,
     * surprise level — mined from our history so the narrative is grounded
     * in data, not generic. */
    context?: string
  }): Promise<{ summary: string; takeaways: string[] } | null> {
    const prompt = `
Sen profesyonel bir futbol analistisin. Aşağıdaki BİTMİŞ maçın veriye dayalı
bir maç sonu değerlendirmesini yaz.

MAÇ: ${input.home} ${input.homeScore} - ${input.awayScore} ${input.away}
TURNUVA: ${input.league}
${input.predictionNote ? `MODEL TAHMİNİ: ${input.predictionNote}` : ''}
${input.context ? `\nANALİTİK BAĞLAM (gerçek verilerden):\n${input.context}` : ''}

Kurallar:
- Türkçe yaz; verilen analitik bağlamdaki SOMUT verilere atıf yap (form,
  ortalamalar, H2H, olaylar). Genel geçer cümle kurma.
- "summary": 3-5 cümlelik maç sonu değerlendirmesi (sonucun anlamı, beklenti
  ile uyumu/sürprizliği, varsa kilit olayların — gol/kırmızı kart — etkisi).
- "takeaways": her iki takım için gelecek maçlara taşınacak 2-4 kısa, veriye
  bağlı çıkarım (ör. "X son 5 maçın 4'ünde 2+ gol attı", "Y üst üste 3.
  maçta kalesini gole kapatamadı").
- SADECE şu JSON: {"summary": string, "takeaways": [string, ...]}
`.trim()

    try {
      const result = await this.model.generateContent(prompt)
      const parsed = JSON.parse(result.response.text())
      const summary = typeof parsed.summary === 'string' ? parsed.summary : ''
      const takeaways = Array.isArray(parsed.takeaways)
        ? parsed.takeaways
            .filter((t: unknown) => typeof t === 'string')
            .slice(0, 6)
        : []
      if (summary.length < 20) return null
      return { summary, takeaways }
    } catch {
      return null
    }
  }

  /**
   * In-play ("maç arası") read for a live or half-time match: repeats the
   * analysis AND the prediction conditioned on the current state — a short
   * Turkish note plus UPDATED final-result probabilities and a projected final
   * score. Null on AI failure; numbers omitted if the model returns them
   * malformed (the summary still stands).
   */
  async summarizeInPlay(input: {
    home: string
    away: string
    homeScore: number
    awayScore: number
    minute: number
    halftime: boolean
    league: string
    context?: string
  }): Promise<{
    summary: string
    homeWinProb?: number
    drawProb?: number
    awayWinProb?: number
    projectedScore?: string
  } | null> {
    const prompt = `
Sen profesyonel bir futbol analistisin. Aşağıdaki maç ŞU AN ${
      input.halftime ? 'DEVRE ARASINDA' : 'OYNANIYOR'
    }. Mevcut duruma göre analizi ve TAHMİNİ GÜNCELLE.

MAÇ: ${input.home} ${input.homeScore} - ${input.awayScore} ${input.away}
TURNUVA: ${input.league}
DAKİKA: ${input.minute}'${input.halftime ? ' (devre arası)' : ''}
${input.context ? `\nMAÇ ÖNCESİ BAĞLAM:\n${input.context}` : ''}

Kurallar:
- Mevcut skoru ve kalan süreyi dikkate alarak NİHAİ SONUÇ olasılıklarını güncelle (toplam %100).
- "projectedScore": maçın biteceği en olası NİHAİ skor (ör. "2-1"), mevcut skoru dikkate al.
- "summary": Türkçe 2-4 cümle; skoru/dakikayı ve beklentiyi (gol olur mu, baskı kimde) anlat.
- Kesin vaat verme; olasılık dili kullan.
- SADECE şu JSON: {"summary": string, "homeWinProb": number, "drawProb": number, "awayWinProb": number, "projectedScore": string}
`.trim()

    try {
      const result = await this.model.generateContent(prompt)
      const parsed = JSON.parse(result.response.text())
      const summary = typeof parsed.summary === 'string' ? parsed.summary : ''
      if (summary.length < 20) return null
      const h = Number(parsed.homeWinProb)
      const d = Number(parsed.drawProb)
      const a = Number(parsed.awayWinProb)
      const probsValid =
        [h, d, a].every((n) => Number.isFinite(n) && n >= 0 && n <= 100) &&
        h + d + a > 0
      const projectedScore =
        typeof parsed.projectedScore === 'string' &&
        /^\d+\s*-\s*\d+$/.test(parsed.projectedScore.trim())
          ? parsed.projectedScore.trim().replace(/\s*/g, '')
          : undefined
      return {
        summary,
        ...(probsValid
          ? {
              homeWinProb: Math.round(h),
              drawProb: Math.round(d),
              awayWinProb: Math.round(a),
            }
          : {}),
        ...(projectedScore ? { projectedScore } : {}),
      }
    } catch {
      return null
    }
  }
}

export const aiPredictionService = new AIPredictionService()

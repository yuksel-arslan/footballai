import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@football-ai/database';
import { config } from '../config';
import { statsService } from './stats.service';
import { aiResponseSchema, type AIPredictionResponse, type PredictionData } from '../types/prediction.types';

const prisma = new PrismaClient();

class AIPredictionService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.ai.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({
      model: config.ai.geminiModel,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2, // More deterministic
      },
    });
  }

  /**
   * Generate AI prediction for a fixture
   */
  async generatePrediction(fixtureId: number): Promise<PredictionData> {
    // Check if prediction already exists
    const existingPrediction = await prisma.prediction.findUnique({
      where: { fixtureId },
    });

    if (existingPrediction) {
      return existingPrediction;
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
    });

    if (!fixture) {
      throw new Error('Maç bulunamadı');
    }

    // Fetch statistics in parallel
    const [homeStatsData, awayStatsData, h2h] = await Promise.all([
      statsService.getTeamStats(fixture.homeTeamId, fixture.leagueId, fixture.season),
      statsService.getTeamStats(fixture.awayTeamId, fixture.leagueId, fixture.season),
      statsService.getH2H(fixture.homeTeamId, fixture.awayTeamId),
    ]);

    // Build prompt
    const prompt = this.buildPrompt(fixture, homeStatsData, awayStatsData, h2h);

    // Call Gemini AI
    const result = await this.model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse and validate response
    let aiResponse: AIPredictionResponse;
    try {
      const parsed = JSON.parse(responseText);
      aiResponse = aiResponseSchema.parse(parsed);
    } catch (error) {
      throw new Error(`AI yanıtı geçersiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Save to database
    const prediction = await prisma.prediction.create({
      data: {
        fixtureId,
        homeWinProb: aiResponse.homeWinProb,
        drawProb: aiResponse.drawProb,
        awayWinProb: aiResponse.awayWinProb,
        predictedHomeScore: aiResponse.predictedHomeScore,
        predictedAwayScore: aiResponse.predictedAwayScore,
        confidence: aiResponse.confidence,
        explanation: aiResponse.explanation,
        aiAnalysis: aiResponse.keyFactors.join(', '),
      },
    });

    return prediction;
  }

  /**
   * Build AI prompt with fixture and stats data
   */
  private buildPrompt(
    fixture: any,
    homeStats: any,
    awayStats: any,
    h2h: any
  ): string {
    const homeStatsInfo = homeStats.stats
      ? `
- Puan Durumu: ${homeStats.stats.rank}. sırada
- Son 5 Maç Formu: ${homeStats.form.join('-')}
- Galibiyet/Beraberlik/Mağlubiyet: ${homeStats.stats.wins}/${homeStats.stats.draws}/${homeStats.stats.losses}
- Atılan/Yenilen Gol: ${homeStats.stats.goalsFor}/${homeStats.stats.goalsAgainst}
- Puan: ${homeStats.stats.points}
`
      : '\n- İstatistik bulunamadı\n';

    const awayStatsInfo = awayStats.stats
      ? `
- Puan Durumu: ${awayStats.stats.rank}. sırada
- Son 5 Maç Formu: ${awayStats.form.join('-')}
- Galibiyet/Beraberlik/Mağlubiyet: ${awayStats.stats.wins}/${awayStats.stats.draws}/${awayStats.stats.losses}
- Atılan/Yenilen Gol: ${awayStats.stats.goalsFor}/${awayStats.stats.goalsAgainst}
- Puan: ${awayStats.stats.points}
`
      : '\n- İstatistik bulunamadı\n';

    const h2hInfo = h2h.summary
      ? `
- Ev Sahibi Galibiyeti: ${h2h.summary.team1Wins}
- Deplasman Galibiyeti: ${h2h.summary.team2Wins}
- Beraberlik: ${h2h.summary.draws}
- Toplam Maç: ${h2h.summary.totalGames}
`
      : '\n- Kafa kafaya veri bulunamadı\n';

    return `
Sen dünyanın en iyi futbol analisti ve veri bilimcisisin. Aşağıdaki verilere dayanarak maç sonucu tahmini yap.

MAÇ: ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}
LİG: ${fixture.league.name}
TARİH: ${fixture.date}

EV SAHİBİ İSTATİSTİKLERİ (${fixture.homeTeam.name}):${homeStatsInfo}
DEPLASMAN İSTATİSTİKLERİ (${fixture.awayTeam.name}):${awayStatsInfo}
KAFA KAFAYA (H2H) SON 10 MAÇ:${h2hInfo}
GÖREV:
1. Kazanma olasılıklarını hesapla (toplam %100 olmalı).
2. En olası skor tahminini yap.
3. Bu tahmini yaparken sakatlıklar, form durumu ve H2H verilerini profesyonelce yorumla.
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
`.trim();
  }
}

export const aiPredictionService = new AIPredictionService();

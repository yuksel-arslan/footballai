import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@football-ai/database';
import { config } from '../config';
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
    const existingPrediction = await prisma.prediction.findFirst({
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

    // Build prompt
    const prompt = this.buildPrompt(fixture);

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
    });

    return prediction;
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
`.trim();
  }
}

export const aiPredictionService = new AIPredictionService();

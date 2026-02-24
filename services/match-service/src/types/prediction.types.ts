import { z } from 'zod';

/**
 * AI Response Schema (Gemini 2.5 Flash output)
 */
export const aiResponseSchema = z
  .object({
    homeWinProb: z.number().int().min(0).max(100),
    drawProb: z.number().int().min(0).max(100),
    awayWinProb: z.number().int().min(0).max(100),
    predictedHomeScore: z.number().int().min(0).max(9),
    predictedAwayScore: z.number().int().min(0).max(9),
    confidence: z.number().min(0).max(1),
    explanation: z.string().min(20),
    keyFactors: z.array(z.string()).max(5),
  })
  .refine(
    (data) => data.homeWinProb + data.drawProb + data.awayWinProb === 100,
    {
      message: 'Olasılıklar toplamı 100 olmalıdır',
    }
  );

export type AIPredictionResponse = z.infer<typeof aiResponseSchema>;

/**
 * Database prediction model
 */
export interface PredictionData {
  id: number;
  fixtureId: number;
  modelVersion: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
  confidence: number;
  features: unknown;
  explanation: string | null;
  keyFactors: unknown;
  createdAt: Date;
}

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { usePredictionStore } from '@/stores/prediction.store';

interface Prediction {
  id: string;
  fixtureId: number;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
  confidence: number;
  explanation: string;
  aiAnalysis: string | null;
  createdAt: string;
}

export const usePrediction = (fixtureId: number) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getPrediction, setPrediction } = usePredictionStore();

  const prediction = getPrediction(fixtureId);

  /**
   * Fetch prediction from API
   */
  const fetchPrediction = useCallback(async () => {
    // Return cached prediction if exists
    if (prediction) return prediction;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{ success: boolean; data: Prediction }>(
        `/api/predictions/${fixtureId}`
      );

      if (response.data.success) {
        const predictionData = response.data.data;
        setPrediction(fixtureId, predictionData);
        return predictionData;
      }

      return null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Tahmin yüklenemedi';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fixtureId, prediction, setPrediction]);

  return {
    prediction,
    isLoading,
    error,
    fetchPrediction,
  };
};

import { create } from 'zustand';

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

interface PredictionState {
  predictions: Record<number, Prediction>; // fixtureId -> Prediction
  isLoading: boolean;
  error: string | null;
  
  setPrediction: (fixtureId: number, prediction: Prediction) => void;
  getPrediction: (fixtureId: number) => Prediction | undefined;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearPredictions: () => void;
}

/**
 * Prediction store
 */
export const usePredictionStore = create<PredictionState>((set, get) => ({
  predictions: {},
  isLoading: false,
  error: null,
  
  setPrediction: (fixtureId: number, prediction: Prediction) => {
    set((state) => ({
      predictions: {
        ...state.predictions,
        [fixtureId]: prediction,
      },
    }));
  },
  
  getPrediction: (fixtureId: number) => {
    return get().predictions[fixtureId];
  },
  
  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },
  
  setError: (error: string | null) => {
    set({ error });
  },
  
  clearPredictions: () => {
    set({ predictions: {}, error: null });
  },
}));

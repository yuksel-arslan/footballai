'use client';

import { useEffect, useState } from 'react';
import { usePredictionStore } from '@/stores/prediction.store';
import { useAuthStore } from '@/stores/auth.store';
import apiClient from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, TrendingUp, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MatchPredictionProps {
  fixtureId: number;
  homeTeamName: string;
  awayTeamName: string;
}

export const MatchPrediction = ({ fixtureId, homeTeamName, awayTeamName }: MatchPredictionProps) => {
  const { isAuthenticated } = useAuthStore();
  const { getPrediction, setPrediction, setLoading, setError, isLoading, error } = usePredictionStore();
  const [localLoading, setLocalLoading] = useState(false);
  const prediction = getPrediction(fixtureId);

  useEffect(() => {
    // Only fetch if authenticated and no prediction exists
    if (isAuthenticated && !prediction && !localLoading) {
      fetchPrediction();
    }
  }, [isAuthenticated, fixtureId]);

  const fetchPrediction = async () => {
    setLocalLoading(true);
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/api/predictions/${fixtureId}`);
      if (response.data.success) {
        setPrediction(fixtureId, response.data.data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Tahmin yüklenemedi';
      setError(errorMessage);
    } finally {
      setLocalLoading(false);
      setLoading(false);
    }
  };

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Tahmin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              AI tahminleri görmek için lütfen giriş yapın.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show loading state
  if (localLoading || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Tahmin
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">AI tahmini hazırlanıyor...</span>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Tahmin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show prediction
  if (!prediction) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Tahmin
        </CardTitle>
        <CardDescription>
          Güven seviyesi: {(prediction.confidence * 100).toFixed(0)}%
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Win Probabilities */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Kazanma Olasılıkları</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{prediction.homeWinProb}%</div>
              <div className="text-xs text-gray-600 mt-1">{homeTeamName}</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{prediction.drawProb}%</div>
              <div className="text-xs text-gray-600 mt-1">Beraberlik</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{prediction.awayWinProb}%</div>
              <div className="text-xs text-gray-600 mt-1">{awayTeamName}</div>
            </div>
          </div>
        </div>

        {/* Predicted Score */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Tahmini Skor</h4>
          <div className="flex items-center justify-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
            <span className="text-3xl font-bold">{prediction.predictedHomeScore}</span>
            <span className="text-gray-400">-</span>
            <span className="text-3xl font-bold">{prediction.predictedAwayScore}</span>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            AI Analizi
          </h4>
          <p className="text-sm text-gray-700 leading-relaxed">{prediction.explanation}</p>
        </div>

        {/* Key Factors */}
        {prediction.aiAnalysis && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Anahtar Faktörler</h4>
            <div className="flex flex-wrap gap-2">
              {prediction.aiAnalysis.split(',').map((factor, idx) => (
                <Badge key={idx} variant="secondary">
                  {factor.trim()}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

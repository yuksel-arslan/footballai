'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * AI Highlights Section for Dashboard
 * Shows AI-powered match insights and recommendations
 */
export const AIHighlights = () => {
  const { isAuthenticated } = useAuthStore();
  const [highlights, setHighlights] = useState<string[]>([]);

  useEffect(() => {
    // Mock highlights - In real app, fetch from API
    if (isAuthenticated) {
      setHighlights([
        'Galatasaray, son 5 maçta %80 kazanma oranıyla güçlü form gösteriyor',
        'Manchester City vs Arsenal maçında yüksek skor bekleniyor (AI güven: %85)',
        'Real Madrid\'in ev sahibi avantajıyla kazanma olasılığı %72',
      ]);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Önerileri
        </CardTitle>
        <CardDescription>
          Yapay zeka destekli maç analizleri ve tahminler
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {highlights.map((highlight, idx) => (
            <Alert key={idx} className="border-purple-200 bg-purple-50">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-900">
                {highlight}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

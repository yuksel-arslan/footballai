'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Sparkles, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLiveFixtures, useUpcomingFixtures } from '@/hooks/use-fixtures';
import { useI18n } from '@/lib/i18n';

/**
 * AI Highlights Section for Dashboard
 * Shows AI-powered match insights based on live and upcoming fixtures
 */
export const AIHighlights = () => {
  const { isAuthenticated } = useAuthStore();
  const { data: liveFixtures = [] } = useLiveFixtures();
  const { data: upcomingFixtures = [] } = useUpcomingFixtures();
  const { language } = useI18n();
  const [highlights, setHighlights] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const newHighlights: string[] = [];

    // Generate highlights from live fixtures
    liveFixtures.slice(0, 2).forEach(fixture => {
      const score = `${fixture.homeScore ?? 0}-${fixture.awayScore ?? 0}`;
      if (language === 'tr') {
        newHighlights.push(
          `${fixture.homeTeam.name} vs ${fixture.awayTeam.name} - Canlı ${score} (${fixture.minute || 0}')`
        );
      } else {
        newHighlights.push(
          `${fixture.homeTeam.name} vs ${fixture.awayTeam.name} - Live ${score} (${fixture.minute || 0}')`
        );
      }
    });

    // Generate highlights from upcoming fixtures
    upcomingFixtures.slice(0, 3 - newHighlights.length).forEach(fixture => {
      const matchDate = new Date(fixture.matchDate);
      const timeStr = matchDate.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      if (language === 'tr') {
        newHighlights.push(
          `${fixture.homeTeam.name} vs ${fixture.awayTeam.name} - ${fixture.league.name} - Saat ${timeStr}`
        );
      } else {
        newHighlights.push(
          `${fixture.homeTeam.name} vs ${fixture.awayTeam.name} - ${fixture.league.name} - At ${timeStr}`
        );
      }
    });

    if (newHighlights.length === 0) {
      if (language === 'tr') {
        newHighlights.push('Yaklaşan maçlar için AI tahminleri hazırlanıyor...');
      } else {
        newHighlights.push('Preparing AI predictions for upcoming matches...');
      }
    }

    setHighlights(newHighlights);
  }, [isAuthenticated, liveFixtures, upcomingFixtures, language]);

  if (!isAuthenticated) {
    return null;
  }

  const title = language === 'tr' ? 'AI Önerileri' : 'AI Insights';
  const desc = language === 'tr'
    ? 'Yapay zeka destekli maç analizleri ve tahminler'
    : 'AI-powered match analysis and predictions';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          {desc}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {highlights.length > 0 ? (
            highlights.map((highlight, idx) => (
              <Alert key={idx} className="border-purple-200 bg-purple-50">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-900">
                  {highlight}
                </AlertDescription>
              </Alert>
            ))
          ) : (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
              <span className="ml-2 text-sm text-muted-foreground">
                {language === 'tr' ? 'Yükleniyor...' : 'Loading...'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

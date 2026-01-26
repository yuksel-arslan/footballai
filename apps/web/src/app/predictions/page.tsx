'use client'

import { useState } from 'react'
import { ChevronRight, Loader2, Target, TrendingUp, Hash, Clock, Trophy, Zap, Sparkles } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { type TranslationKeys } from '@/lib/i18n/translations'

// Mock upcoming matches
const upcomingMatches = [
  { id: 1, home: 'Man United', away: 'Liverpool', league: 'Premier League', date: 'Jan 26', time: '20:00' },
  { id: 2, home: 'Barcelona', away: 'Real Madrid', league: 'La Liga', date: 'Jan 27', time: '21:00' },
  { id: 3, home: 'Bayern', away: 'Dortmund', league: 'Bundesliga', date: 'Jan 27', time: '18:30' },
  { id: 4, home: 'Juventus', away: 'Inter', league: 'Serie A', date: 'Jan 28', time: '20:45' },
  { id: 5, home: 'Galatasaray', away: 'Fenerbahçe', league: 'Süper Lig', date: 'Jan 26', time: '19:00' },
  { id: 6, home: 'PSG', away: 'Marseille', league: 'Ligue 1', date: 'Jan 28', time: '20:45' },
]

// Prediction generator with i18n support
function generatePrediction(_matchId: number, betType: string, t: TranslationKeys) {
  const predictions: Record<string, any> = {
    match_result: {
      recommendation: t.predictions.homeWin,
      confidence: 68,
      odds: { home: 45, draw: 28, away: 27 },
      analysis: t.predictions.homeWin,
      factors: [t.predictions.homeWin, t.predictions.confidence],
    },
    over_under: {
      recommendation: 'Over 2.5',
      confidence: 72,
      odds: { over: 65, under: 35 },
      analysis: 'Over 2.5 goals',
      factors: ['High goal average', 'Weak defenses'],
    },
    both_score: {
      recommendation: 'Yes - BTTS',
      confidence: 75,
      odds: { yes: 70, no: 30 },
      analysis: 'Both teams score',
      factors: ['Defense weaknesses', 'Effective strikers'],
    },
    first_half: {
      recommendation: t.predictions.draw,
      confidence: 55,
      odds: { home: 30, draw: 40, away: 30 },
      analysis: 'First half draw',
      factors: ['Derby psychology', 'Defensive start'],
    },
    correct_score: {
      recommendation: '2-1',
      confidence: 18,
      odds: { score: '2-1', probability: 12 },
      analysis: t.predictions.predictedScore,
      factors: ['Goal averages', 'Form'],
    },
    winner_margin: {
      recommendation: 'Home -1',
      confidence: 52,
      odds: { home: 45, draw: 30, away: 25 },
      analysis: 'Home team handicap',
      factors: ['Power difference', 'Motivation'],
    },
  }
  return predictions[betType] || predictions.match_result
}

export default function PredictionsPage() {
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null)
  const [selectedBetType, setSelectedBetType] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const { t, language } = useI18n()

  // Localized labels
  const labels = {
    selectMatch: language === 'tr' ? 'Maç Seç' : language === 'de' ? 'Spiel wählen' : language === 'es' ? 'Seleccionar Partido' : language === 'it' ? 'Seleziona Partita' : language === 'fr' ? 'Sélectionner Match' : 'Select Match',
    betType: language === 'tr' ? 'Bahis Tipi' : language === 'de' ? 'Wettart' : language === 'es' ? 'Tipo de Apuesta' : language === 'it' ? 'Tipo Scommessa' : language === 'fr' ? 'Type de Pari' : 'Bet Type',
    change: language === 'tr' ? 'Değiştir' : language === 'de' ? 'Ändern' : language === 'es' ? 'Cambiar' : language === 'it' ? 'Cambia' : language === 'fr' ? 'Changer' : 'Change',
    getPrediction: language === 'tr' ? 'Tahmin Al' : language === 'de' ? 'Vorhersage holen' : language === 'es' ? 'Obtener Predicción' : language === 'it' ? 'Ottieni Previsione' : language === 'fr' ? 'Obtenir Prédiction' : 'Get Prediction',
    analyzing: language === 'tr' ? 'Analiz...' : language === 'de' ? 'Analysieren...' : language === 'es' ? 'Analizando...' : language === 'it' ? 'Analizzando...' : language === 'fr' ? 'Analyse...' : 'Analyzing...',
    newPrediction: language === 'tr' ? 'Yeni' : language === 'de' ? 'Neu' : language === 'es' ? 'Nuevo' : language === 'it' ? 'Nuovo' : language === 'fr' ? 'Nouveau' : 'New',
    aiPrediction: language === 'tr' ? 'AI Tahmini' : language === 'de' ? 'KI-Vorhersage' : language === 'es' ? 'Predicción IA' : language === 'it' ? 'Previsione IA' : language === 'fr' ? 'Prédiction IA' : 'AI Prediction',
    disclaimer: language === 'tr' ? 'Bu tahminler bilgilendirme amaçlıdır. Bahis kararlarınız size aittir.' : language === 'de' ? 'Diese Vorhersagen dienen nur zur Information. Wettentscheidungen liegen bei Ihnen.' : language === 'es' ? 'Estas predicciones son solo informativas. Las decisiones de apuestas son tuyas.' : language === 'it' ? 'Queste previsioni sono solo informative. Le decisioni sulle scommesse sono tue.' : language === 'fr' ? 'Ces prédictions sont à titre informatif. Les décisions de paris vous appartiennent.' : 'These predictions are for informational purposes. Betting decisions are yours.',
    stepMatch: language === 'tr' ? 'Maç' : language === 'de' ? 'Spiel' : language === 'es' ? 'Partido' : language === 'it' ? 'Partita' : language === 'fr' ? 'Match' : 'Match',
    stepType: language === 'tr' ? 'Tip' : language === 'de' ? 'Typ' : language === 'es' ? 'Tipo' : language === 'it' ? 'Tipo' : language === 'fr' ? 'Type' : 'Type',
    stepPrediction: language === 'tr' ? 'Tahmin' : language === 'de' ? 'Vorhersage' : language === 'es' ? 'Predicción' : language === 'it' ? 'Previsione' : language === 'fr' ? 'Prédiction' : 'Prediction',
    matchResult: language === 'tr' ? 'Maç Sonucu' : language === 'de' ? 'Spielergebnis' : language === 'es' ? 'Resultado' : language === 'it' ? 'Risultato' : language === 'fr' ? 'Résultat' : 'Match Result',
    overUnder: language === 'tr' ? 'Üst/Alt' : 'Over/Under',
    bothScore: language === 'tr' ? 'KG Var/Yok' : 'BTTS',
    firstHalf: language === 'tr' ? 'İlk Yarı' : language === 'de' ? 'Erste Halbzeit' : language === 'es' ? 'Primera Mitad' : language === 'it' ? 'Primo Tempo' : language === 'fr' ? 'Mi-temps' : 'First Half',
    correctScore: language === 'tr' ? 'Skor Tahmini' : language === 'de' ? 'Genaues Ergebnis' : language === 'es' ? 'Marcador Exacto' : language === 'it' ? 'Risultato Esatto' : language === 'fr' ? 'Score Exact' : 'Correct Score',
    handicap: language === 'tr' ? 'Handikap' : 'Handicap',
  }

  // Bet types with translations
  const betTypes = [
    { id: 'match_result', name: labels.matchResult, desc: '1X2', icon: Trophy },
    { id: 'over_under', name: labels.overUnder, desc: 'Total goals', icon: Hash },
    { id: 'both_score', name: labels.bothScore, desc: 'BTTS', icon: Target },
    { id: 'first_half', name: labels.firstHalf, desc: 'HT result', icon: Clock },
    { id: 'correct_score', name: labels.correctScore, desc: 'Exact score', icon: Zap },
    { id: 'winner_margin', name: labels.handicap, desc: 'Goal margin', icon: TrendingUp },
  ]

  const handleMatchSelect = (matchId: number) => {
    setSelectedMatch(matchId)
    setSelectedBetType(null)
    setPrediction(null)
    setStep(2)
  }

  const handleBetTypeSelect = (betTypeId: string) => {
    setSelectedBetType(betTypeId)
    setPrediction(null)
  }

  const handleGetPrediction = async () => {
    if (!selectedMatch || !selectedBetType) return
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1200))
    const result = generatePrediction(selectedMatch, selectedBetType, t)
    setPrediction(result)
    setLoading(false)
    setStep(3)
  }

  const handleReset = () => {
    setSelectedMatch(null)
    setSelectedBetType(null)
    setPrediction(null)
    setStep(1)
  }

  const selectedMatchData = upcomingMatches.find((m) => m.id === selectedMatch)
  const selectedBetTypeData = betTypes.find((b) => b.id === selectedBetType)

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-3 sm:px-4 pb-6">
        {/* Page Header */}
        <div className="py-4 sm:py-6">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent">
            {t.predictions.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t.predictions.subtitle}</p>
        </div>

        {/* Progress Steps - Compact */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          {[
            { num: 1, label: labels.stepMatch },
            { num: 2, label: labels.stepType },
            { num: 3, label: labels.stepPrediction },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-2 sm:gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                    step >= s.num
                      ? 'bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] text-white'
                      : 'bg-card border border-border text-muted-foreground'
                  }`}
                >
                  {s.num}
                </div>
                <span className={`text-[10px] sm:text-xs mt-0.5 ${step >= s.num ? 'text-[#0EA5E9]' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
              {i < 2 && <ChevronRight className={`w-4 h-4 ${step > s.num ? 'text-[#0EA5E9]' : 'text-muted-foreground'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Match Selection */}
        {step === 1 && (
          <section>
            <h2 className="text-sm sm:text-base font-semibold mb-3 text-[#0EA5E9]">{labels.selectMatch}</h2>
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingMatches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => handleMatchSelect(match.id)}
                  className="neon-card p-3 sm:p-4 rounded-lg text-left transition-all hover:scale-[1.01] group"
                >
                  <div className="text-[10px] sm:text-xs text-muted-foreground mb-2 flex justify-between">
                    <span>{match.league}</span>
                    <span>{match.date} {match.time}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium truncate flex-1">{match.home}</span>
                    <span className="text-muted-foreground mx-2">vs</span>
                    <span className="font-medium truncate flex-1 text-right">{match.away}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Step 2: Bet Type Selection */}
        {step === 2 && selectedMatchData && (
          <section>
            {/* Selected Match - Compact */}
            <div className="neon-card p-3 rounded-lg mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">{selectedMatchData.league}</p>
                <p className="text-sm font-medium">
                  <span className="text-[#0EA5E9]">{selectedMatchData.home}</span>
                  <span className="text-muted-foreground mx-2">vs</span>
                  <span className="text-[#0EA5E9]">{selectedMatchData.away}</span>
                </p>
              </div>
              <button onClick={handleReset} className="text-xs text-muted-foreground hover:text-[#0EA5E9]">
                {labels.change}
              </button>
            </div>

            <h2 className="text-sm sm:text-base font-semibold mb-3 text-[#0EA5E9]">{labels.betType}</h2>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
              {betTypes.map((bet) => {
                const Icon = bet.icon
                const isSelected = selectedBetType === bet.id
                return (
                  <button
                    key={bet.id}
                    onClick={() => handleBetTypeSelect(bet.id)}
                    className={`p-3 rounded-lg text-left transition-all border ${
                      isSelected ? 'border-[#0EA5E9] bg-[#0EA5E9]/10' : 'border-border bg-card hover:border-[#0EA5E9]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[#0EA5E9]' : 'text-muted-foreground'}`} />
                      <span className={`text-xs sm:text-sm font-medium ${isSelected ? 'text-[#0EA5E9]' : ''}`}>{bet.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{bet.desc}</p>
                  </button>
                )
              })}
            </div>

            {/* Get Prediction Button */}
            {selectedBetType && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={handleGetPrediction}
                  disabled={loading}
                  className="btn-neon px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {labels.analyzing}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {labels.getPrediction}
                    </>
                  )}
                </button>
              </div>
            )}
          </section>
        )}

        {/* Step 3: Show Prediction */}
        {step === 3 && prediction && selectedMatchData && selectedBetTypeData && (
          <section>
            {/* Match Header - Compact */}
            <div className="neon-card p-3 rounded-lg mb-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground">{selectedMatchData.league} • {selectedBetTypeData.name}</p>
                <p className="text-sm font-medium">
                  <span className="text-[#0EA5E9]">{selectedMatchData.home}</span>
                  <span className="text-muted-foreground mx-2">vs</span>
                  <span className="text-[#0EA5E9]">{selectedMatchData.away}</span>
                </p>
              </div>
              <button onClick={handleReset} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:border-[#0EA5E9]">
                {labels.newPrediction}
              </button>
            </div>

            {/* Prediction Result - Compact */}
            <div className="rounded-xl p-4 sm:p-5 mb-4 bg-gradient-to-br from-[#2563EB]/10 to-[#0EA5E9]/10 border border-[#0EA5E9]/30">
              <div className="text-center mb-4">
                <p className="text-xs text-muted-foreground mb-1">{labels.aiPrediction}</p>
                <h2 className="text-lg sm:text-xl font-bold text-[#0EA5E9]">{prediction.recommendation}</h2>
              </div>

              {/* Confidence Meter */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{t.predictions.confidence}</span>
                  <span className="font-bold" style={{ color: prediction.confidence >= 70 ? '#10B981' : prediction.confidence >= 50 ? '#FBBF24' : '#EF4444' }}>
                    %{prediction.confidence}
                  </span>
                </div>
                <div className="h-2 bg-card rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${prediction.confidence}%`,
                      background: prediction.confidence >= 70 ? 'linear-gradient(90deg, #10B981, #34D399)' : prediction.confidence >= 50 ? 'linear-gradient(90deg, #F59E0B, #FBBF24)' : 'linear-gradient(90deg, #EF4444, #F87171)',
                    }}
                  />
                </div>
              </div>

              {/* Odds */}
              {prediction.odds && (
                <div className="grid gap-2 grid-cols-3 mb-4">
                  {Object.entries(prediction.odds).map(([key, value]) => {
                    const oddsLabels: Record<string, string> = {
                      home: language === 'tr' ? 'Ev' : language === 'de' ? 'Heim' : language === 'es' ? 'Local' : language === 'it' ? 'Casa' : language === 'fr' ? 'Dom' : 'Home',
                      draw: 'X',
                      away: language === 'tr' ? 'Dep' : language === 'de' ? 'Ausw' : language === 'es' ? 'Vis' : language === 'it' ? 'Trasf' : language === 'fr' ? 'Ext' : 'Away',
                      over: language === 'tr' ? 'Üst' : 'Over',
                      under: language === 'tr' ? 'Alt' : 'Under',
                      yes: language === 'tr' ? 'Var' : language === 'de' ? 'Ja' : language === 'es' ? 'Sí' : language === 'it' ? 'Sì' : language === 'fr' ? 'Oui' : 'Yes',
                      no: language === 'tr' ? 'Yok' : language === 'de' ? 'Nein' : language === 'es' ? 'No' : language === 'it' ? 'No' : language === 'fr' ? 'Non' : 'No',
                    }
                    return (
                      <div key={key} className="bg-card/50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {oddsLabels[key] || key}
                        </p>
                        <p className="text-sm font-bold text-[#0EA5E9]">%{String(value)}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Analysis - Compact */}
              <div className="bg-card/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">{prediction.analysis}</p>
                <div className="flex flex-wrap gap-1">
                  {prediction.factors.map((factor: string, i: number) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9]">
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-center text-[10px] text-muted-foreground">
              {labels.disclaimer}
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

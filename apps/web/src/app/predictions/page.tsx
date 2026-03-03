'use client'

import { useState } from 'react'
import { ChevronRight, Loader2, Target, TrendingUp, Hash, Clock, Trophy, Zap } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useUpcomingFixtures } from '@/hooks/use-fixtures'
import { useAIPrediction } from '@/hooks/use-prediction'
import type { Fixture } from '@/lib/api'


function formatDate(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr)
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
  }
}

function PredictionResult({ fixtureId, homeTeamName, awayTeamName }: { fixtureId: number; homeTeamName: string; awayTeamName: string }) {
  const { data: prediction, isLoading, isError, refetch } = useAIPrediction(fixtureId, 'token')
  const { language } = useI18n()

  const aiPredictionLabel = language === 'tr' ? 'AI Tahmini' : 'AI Prediction'
  const confidenceLabel = language === 'tr' ? 'Güven' : 'Confidence'
  const predictedScoreLabel = language === 'tr' ? 'Tahmini Skor' : 'Predicted Score'
  const loadingLabel = language === 'tr' ? 'Yükleniyor...' : 'Loading...'
  const errorLabel = language === 'tr' ? 'Tahmin alınamadı' : 'Could not get prediction'
  const retryLabel = language === 'tr' ? 'Tekrar Dene' : 'Retry'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#0EA5E9]" />
        <span className="ml-2 text-sm text-muted-foreground">{loadingLabel}</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-red-500 mb-2">{errorLabel}</p>
        <button
          onClick={() => refetch()}
          className="text-xs text-[#0EA5E9] hover:underline"
        >
          {retryLabel}
        </button>
      </div>
    )
  }

  if (!prediction) return null

  return (
    <div className="rounded-xl p-4 sm:p-5 bg-gradient-to-br from-[#2563EB]/10 to-[#0EA5E9]/10 border border-[#0EA5E9]/30">
      <div className="text-center mb-4">
        <p className="text-xs text-muted-foreground mb-1">{aiPredictionLabel}</p>
      </div>

      {/* Win Probabilities */}
      <div className="grid gap-2 grid-cols-3 mb-4">
        <div className="bg-card/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground truncate">{homeTeamName}</p>
          <p className="text-sm font-bold text-[#0EA5E9]">%{prediction.homeWinProb}</p>
        </div>
        <div className="bg-card/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground">X</p>
          <p className="text-sm font-bold text-[#0EA5E9]">%{prediction.drawProb}</p>
        </div>
        <div className="bg-card/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground truncate">{awayTeamName}</p>
          <p className="text-sm font-bold text-[#0EA5E9]">%{prediction.awayWinProb}</p>
        </div>
      </div>

      {/* Predicted Score */}
      {prediction.predictedHomeScore != null && (
        <div className="text-center mb-3">
          <p className="text-[10px] text-muted-foreground mb-1">{predictedScoreLabel}</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-xl font-bold">{prediction.predictedHomeScore}</span>
            <span className="text-muted-foreground">-</span>
            <span className="text-xl font-bold">{prediction.predictedAwayScore}</span>
          </div>
        </div>
      )}

      {/* Confidence */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">{confidenceLabel}</span>
          <span className="font-bold" style={{ color: prediction.confidence >= 70 ? '#10B981' : prediction.confidence >= 50 ? '#FBBF24' : '#EF4444' }}>
            %{prediction.confidence.toFixed(0)}
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

      {/* Explanation */}
      {prediction.explanation && (
        <div className="bg-card/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">{prediction.explanation}</p>
        </div>
      )}
    </div>
  )
}

export default function PredictionsPage() {
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null)
  const [selectedBetType, setSelectedBetType] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const { t, language } = useI18n()

  // Fetch real fixtures from API
  const { data: fixtures, isLoading: fixturesLoading } = useUpcomingFixtures()

  // Build match list from real API data
  const matches: Array<{ id: number; home: string; away: string; league: string; date: string; time: string }> =
    (fixtures || []).slice(0, 12).map((f: Fixture) => {
      const { date, time } = formatDate(f.matchDate)
      return { id: f.id, home: f.homeTeam.name, away: f.awayTeam.name, league: f.league.name, date, time }
    })

  // Localized labels
  const labels = {
    selectMatch: language === 'tr' ? 'Maç Seç' : language === 'de' ? 'Spiel wählen' : language === 'es' ? 'Seleccionar Partido' : language === 'it' ? 'Seleziona Partita' : language === 'fr' ? 'Sélectionner Match' : 'Select Match',
    betType: language === 'tr' ? 'Bahis Tipi' : language === 'de' ? 'Wettart' : language === 'es' ? 'Tipo de Apuesta' : language === 'it' ? 'Tipo Scommessa' : language === 'fr' ? 'Type de Pari' : 'Bet Type',
    change: language === 'tr' ? 'Değiştir' : language === 'de' ? 'Ändern' : language === 'es' ? 'Cambiar' : language === 'it' ? 'Cambia' : language === 'fr' ? 'Changer' : 'Change',
    newPrediction: language === 'tr' ? 'Yeni' : language === 'de' ? 'Neu' : language === 'es' ? 'Nuevo' : language === 'it' ? 'Nuovo' : language === 'fr' ? 'Nouveau' : 'New',
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
    loading: language === 'tr' ? 'Maçlar yükleniyor...' : 'Loading matches...',
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
    setStep(2)
  }

  const handleBetTypeSelect = (betTypeId: string) => {
    setSelectedBetType(betTypeId)
    setStep(3)
  }

  const handleReset = () => {
    setSelectedMatch(null)
    setSelectedBetType(null)
    setStep(1)
  }

  const selectedMatchData = matches.find((m) => m.id === selectedMatch)
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
            {fixturesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#0EA5E9]" />
                <span className="ml-2 text-sm text-muted-foreground">{labels.loading}</span>
              </div>
            ) : matches.length > 0 ? (
              <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {matches.map((match) => (
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
            ) : (
              <div className="neon-card rounded-2xl p-12 text-center">
                <p className="text-muted-foreground text-sm">
                  {language === 'tr' ? 'Şu an planlanmış maç bulunamadı. API bağlantısını kontrol edin.' : 'No scheduled matches found. Please check your API connection.'}
                </p>
              </div>
            )}
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
          </section>
        )}

        {/* Step 3: Show Prediction */}
        {step === 3 && selectedMatchData && selectedBetTypeData && (
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

            {/* Prediction from API */}
            <PredictionResult
              fixtureId={selectedMatch!}
              homeTeamName={selectedMatchData.home}
              awayTeamName={selectedMatchData.away}
            />

            {/* Disclaimer */}
            <p className="text-center text-[10px] text-muted-foreground mt-4">
              {labels.disclaimer}
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

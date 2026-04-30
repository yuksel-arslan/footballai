'use client'

import { useState } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  ChevronRight,
  Loader2,
  Target,
  TrendingUp,
  Hash,
  Clock,
  Trophy,
  Zap,
  User,
  Check,
  X as XIcon,
  Trash2,
  Cpu,
  Sparkles,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth/use-auth'
import { useUpcomingFixtures } from '@/hooks/use-fixtures'
import { useAIPrediction, type PredictionData } from '@/hooks/use-prediction'
import { AI_MODELS } from '@/lib/ai-config'
import {
  useUserPredictions,
  useUserPredictionStats,
  useDeletePrediction,
  useAIAccuracyStats,
} from '@/hooks/use-user-predictions'
import type { Fixture } from '@/lib/api'

function formatDate(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr)
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  }
}

function PredictionResult({
  fixtureId,
  homeTeamName,
  awayTeamName,
  league,
}: {
  fixtureId: number
  homeTeamName: string
  awayTeamName: string
  league: string
}) {
  const { language } = useI18n()
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const aiMutation = useAIPrediction()
  const [selectedModelId, setSelectedModelId] =
    useState<string>('gemini-2.5-flash')
  const [prediction, setPrediction] = useState<PredictionData | null>(null)

  const aiPredictionLabel = language === 'tr' ? 'AI Tahmini' : 'AI Prediction'
  const confidenceLabel = language === 'tr' ? 'Güven' : 'Confidence'
  const predictedScoreLabel =
    language === 'tr' ? 'Tahmini Skor' : 'Predicted Score'
  const errorLabel =
    language === 'tr'
      ? 'Tahmin alınamadı, kredi iade edildi'
      : 'Prediction failed, credit refunded'

  const handlePredict = () => {
    if (!isAuthenticated) {
      router.push(`/login?returnTo=${encodeURIComponent(pathname)}`)
      return
    }
    aiMutation.mutate(
      {
        fixtureId,
        modelId: selectedModelId,
        match: { homeTeam: homeTeamName, awayTeam: awayTeamName, league },
      },
      {
        onSuccess: (result) => setPrediction(result.prediction),
        onError: (err) => {
          if (err.failure.kind === 'unauthenticated') {
            router.push(`/login?returnTo=${encodeURIComponent(pathname)}`)
          } else if (err.failure.kind === 'insufficient_credits') {
            router.push('/pricing')
          }
        },
      }
    )
  }

  if (!prediction) {
    const cost =
      AI_MODELS.find((m) => m.id === selectedModelId)?.creditCost ?? '?'
    return (
      <div className="rounded-xl p-3 bg-card/30 border border-border space-y-2">
        <div className="text-[11px] text-muted-foreground mb-1">
          {aiPredictionLabel}
        </div>
        <select
          value={selectedModelId}
          onChange={(e) => setSelectedModelId(e.target.value)}
          className="w-full px-2 py-1.5 rounded-md text-xs bg-card border border-border focus:outline-none focus:border-[#2563EB]"
          disabled={aiMutation.isPending}
        >
          {AI_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name.replace('Gemini ', '')} — {m.creditCost} cr
            </option>
          ))}
        </select>
        {aiMutation.isError &&
          aiMutation.error?.failure.kind === 'prediction_failed' && (
            <p className="text-[11px] text-red-500">{errorLabel}</p>
          )}
        <button
          onClick={handlePredict}
          disabled={aiMutation.isPending}
          className="w-full py-1.5 rounded-md text-xs font-medium text-white bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {aiMutation.isPending ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              {language === 'tr' ? 'Tahmin ediliyor…' : 'Predicting…'}
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3" />
              {language === 'tr'
                ? `Tahmin et (${cost} cr)`
                : `Predict (${cost} cr)`}
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-4 sm:p-5 bg-gradient-to-br from-[#2563EB]/10 to-[#0EA5E9]/10 border border-[#0EA5E9]/30">
      <div className="text-center mb-4">
        <p className="text-xs text-muted-foreground mb-1">
          {aiPredictionLabel}
        </p>
      </div>

      {/* Win Probabilities */}
      <div className="grid gap-2 grid-cols-3 mb-4">
        <div className="bg-card/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground truncate">
            {homeTeamName}
          </p>
          <p className="text-sm font-bold text-[#0EA5E9]">
            %{prediction.homeWinProb}
          </p>
        </div>
        <div className="bg-card/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground">X</p>
          <p className="text-sm font-bold text-[#0EA5E9]">
            %{prediction.drawProb}
          </p>
        </div>
        <div className="bg-card/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground truncate">
            {awayTeamName}
          </p>
          <p className="text-sm font-bold text-[#0EA5E9]">
            %{prediction.awayWinProb}
          </p>
        </div>
      </div>

      {/* Predicted Score */}
      {prediction.predictedHomeScore != null && (
        <div className="text-center mb-3">
          <p className="text-[10px] text-muted-foreground mb-1">
            {predictedScoreLabel}
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-xl font-bold">
              {prediction.predictedHomeScore}
            </span>
            <span className="text-muted-foreground">-</span>
            <span className="text-xl font-bold">
              {prediction.predictedAwayScore}
            </span>
          </div>
        </div>
      )}

      {/* Confidence */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">{confidenceLabel}</span>
          <span
            className="font-bold"
            style={{
              color:
                prediction.confidence >= 70
                  ? '#10B981'
                  : prediction.confidence >= 50
                    ? '#FBBF24'
                    : '#EF4444',
            }}
          >
            %{prediction.confidence.toFixed(0)}
          </span>
        </div>
        <div className="h-2 bg-card rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${prediction.confidence}%`,
              background:
                prediction.confidence >= 70
                  ? 'linear-gradient(90deg, #10B981, #34D399)'
                  : prediction.confidence >= 50
                    ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                    : 'linear-gradient(90deg, #EF4444, #F87171)',
            }}
          />
        </div>
      </div>

      {/* Explanation */}
      {prediction.explanation && (
        <div className="bg-card/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            {prediction.explanation}
          </p>
        </div>
      )}
    </div>
  )
}

function MyPredictions() {
  const { language } = useI18n()
  const { data, isLoading, isError, refetch } = useUserPredictions()
  const { data: stats } = useUserPredictionStats()
  const { data: aiStats } = useAIAccuracyStats()
  const deletePrediction = useDeletePrediction()

  const predictions = data?.data || []

  const labels = {
    noPredictions:
      language === 'tr' ? 'Henüz tahmin yapmadınız' : 'No predictions yet',
    goPredict:
      language === 'tr'
        ? 'Maçlara gidip tahmin yapın'
        : 'Go to matches and make predictions',
    accuracy: language === 'tr' ? 'Doğruluk' : 'Accuracy',
    total: language === 'tr' ? 'Toplam' : 'Total',
    correct: language === 'tr' ? 'Doğru' : 'Correct',
    home: language === 'tr' ? 'Ev Sahibi' : 'Home',
    draw: language === 'tr' ? 'Berabere' : 'Draw',
    away: language === 'tr' ? 'Deplasman' : 'Away',
    yourPick: language === 'tr' ? 'Tahminin' : 'Your Pick',
    pending: language === 'tr' ? 'Bekliyor' : 'Pending',
    aiAccuracy: language === 'tr' ? 'AI Doğruluğu' : 'AI Accuracy',
    yourAccuracy: language === 'tr' ? 'Senin Doğruluğun' : 'Your Accuracy',
    scorePredictions: language === 'tr' ? 'Skor Tutturma' : 'Score Correct',
    yourScore: language === 'tr' ? 'Skor Tahminin' : 'Your Score',
  }

  const resultLabel = (r: string) => {
    if (r === 'home') return labels.home
    if (r === 'draw') return labels.draw
    return labels.away
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#0EA5E9]" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="neon-card rounded-xl p-8 text-center">
        <XIcon className="w-10 h-10 text-red-500/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          {language === 'tr'
            ? 'Tahminler yüklenirken hata oluştu'
            : 'Failed to load predictions'}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-xs text-[#0EA5E9] hover:underline"
        >
          {language === 'tr' ? 'Tekrar Dene' : 'Retry'}
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* AI vs User Accuracy Comparison */}
      {stats && aiStats && (
        <div className="neon-card rounded-xl p-4 mb-4 sm:mb-6">
          <h4 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            {language === 'tr' ? 'AI vs Sen' : 'AI vs You'}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {/* AI Stats */}
            <div className="rounded-lg p-3 bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-1.5 mb-2">
                <Cpu className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-semibold text-primary">
                  AI
                </span>
              </div>
              <p className="text-2xl font-bold text-primary">
                %{aiStats.accuracy}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {aiStats.correctPredictions}/{aiStats.totalPredictions}{' '}
                {labels.correct.toLowerCase()}
              </p>
            </div>
            {/* User Stats */}
            <div className="rounded-lg p-3 bg-[#FBBF24]/5 border border-[#FBBF24]/20">
              <div className="flex items-center gap-1.5 mb-2">
                <User className="w-3.5 h-3.5 text-[#FBBF24]" />
                <span className="text-[10px] font-semibold text-[#FBBF24]">
                  {language === 'tr' ? 'Sen' : 'You'}
                </span>
              </div>
              <p className="text-2xl font-bold text-[#FBBF24]">
                %{stats.accuracy}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {stats.correct}/{stats.total} {labels.correct.toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="neon-card rounded-xl p-3 sm:p-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-[#0EA5E9]">
              {stats.total}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              {labels.total}
            </p>
          </div>
          <div className="neon-card rounded-xl p-3 sm:p-4 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-green-500">
              {stats.correct}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              {labels.correct}
            </p>
          </div>
          <div className="neon-card rounded-xl p-3 sm:p-4 text-center">
            <p
              className="text-2xl sm:text-3xl font-bold"
              style={{ color: stats.accuracy >= 50 ? '#10B981' : '#FBBF24' }}
            >
              %{stats.accuracy}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              {labels.accuracy}
            </p>
          </div>
        </div>
      )}

      {/* Predictions List */}
      {predictions.length === 0 ? (
        <div className="neon-card rounded-xl p-8 text-center">
          <Target className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {labels.noPredictions}
          </p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            {labels.goPredict}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {predictions.map((p: any) => {
            const fixture = p.prediction?.fixture
            if (!fixture) return null
            const isFinished = fixture.status === 'FINISHED'
            return (
              <div key={p.id} className="neon-card rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{fixture.league?.name}</span>
                    <span>
                      {new Date(fixture.matchDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.wasCorrect === true && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500">
                        <Check className="w-3 h-3 inline" />
                      </span>
                    )}
                    {p.wasCorrect === false && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500">
                        <XIcon className="w-3 h-3 inline" />
                      </span>
                    )}
                    {p.wasCorrect === null && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {labels.pending}
                      </span>
                    )}
                    <button
                      onClick={() => deletePrediction.mutate(p.id)}
                      className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 flex-1">
                    {fixture.homeTeam.logoUrl && (
                      <Image
                        src={fixture.homeTeam.logoUrl}
                        alt=""
                        width={20}
                        height={20}
                        className="rounded"
                      />
                    )}
                    <span className="font-medium truncate">
                      {fixture.homeTeam.name}
                    </span>
                  </div>
                  <div className="px-3 text-center">
                    {isFinished ? (
                      <span className="font-bold tabular-nums">
                        {fixture.homeScore ?? 0} - {fixture.awayScore ?? 0}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">vs</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className="font-medium truncate">
                      {fixture.awayTeam.name}
                    </span>
                    {fixture.awayTeam.logoUrl && (
                      <Image
                        src={fixture.awayTeam.logoUrl}
                        alt=""
                        width={20}
                        height={20}
                        className="rounded"
                      />
                    )}
                  </div>
                </div>

                {/* User prediction details */}
                <div className="mt-2 flex items-center justify-center gap-3">
                  <div className="text-center">
                    <span className="text-[10px] text-muted-foreground">
                      {labels.yourPick}:{' '}
                    </span>
                    <span className="text-xs font-medium text-[#FBBF24]">
                      {resultLabel(p.predictedResult)}
                    </span>
                  </div>
                  {p.predictedHomeScore !== null &&
                    p.predictedHomeScore !== undefined && (
                      <div className="text-center">
                        <span className="text-[10px] text-muted-foreground">
                          {labels.yourScore}:{' '}
                        </span>
                        <span
                          className={`text-xs font-bold tabular-nums ${p.scoreCorrect ? 'text-green-500' : ''}`}
                        >
                          {p.predictedHomeScore} - {p.predictedAwayScore}
                        </span>
                        {p.scoreCorrect && (
                          <Check className="w-3 h-3 inline text-green-500 ml-0.5" />
                        )}
                      </div>
                    )}
                </div>

                {/* AI prediction comparison for finished matches */}
                {isFinished && p.prediction && (
                  <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-center gap-2 text-[10px]">
                    <Cpu className="w-3 h-3 text-primary" />
                    <span className="text-muted-foreground">AI:</span>
                    <span className="font-medium">
                      {Math.round(p.prediction.predictedHomeScore)} -{' '}
                      {Math.round(p.prediction.predictedAwayScore)}
                    </span>
                    <span className="text-muted-foreground">
                      (%
                      {Math.round(
                        Math.max(
                          p.prediction.homeWinProb,
                          p.prediction.drawProb,
                          p.prediction.awayWinProb
                        )
                      )}
                      )
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function PredictionsPage() {
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null)
  const [selectedBetType, setSelectedBetType] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [activeTab, setActiveTab] = useState<'ai' | 'my'>('ai')
  const { t, language } = useI18n()
  const { isAuthenticated } = useAuth()

  // Fetch real fixtures from API
  const { data: fixtures, isLoading: fixturesLoading } = useUpcomingFixtures()

  // Build match list from real API data
  const matches: Array<{
    id: number
    home: string
    away: string
    league: string
    date: string
    time: string
  }> = (fixtures || []).slice(0, 12).map((f: Fixture) => {
    const { date, time } = formatDate(f.matchDate)
    return {
      id: f.id,
      home: f.homeTeam.name,
      away: f.awayTeam.name,
      league: f.league.name,
      date,
      time,
    }
  })

  // Localized labels
  const labels = {
    selectMatch:
      language === 'tr'
        ? 'Maç Seç'
        : language === 'de'
          ? 'Spiel wählen'
          : language === 'es'
            ? 'Seleccionar Partido'
            : language === 'it'
              ? 'Seleziona Partita'
              : language === 'fr'
                ? 'Sélectionner Match'
                : 'Select Match',
    betType:
      language === 'tr'
        ? 'Bahis Tipi'
        : language === 'de'
          ? 'Wettart'
          : language === 'es'
            ? 'Tipo de Apuesta'
            : language === 'it'
              ? 'Tipo Scommessa'
              : language === 'fr'
                ? 'Type de Pari'
                : 'Bet Type',
    change:
      language === 'tr'
        ? 'Değiştir'
        : language === 'de'
          ? 'Ändern'
          : language === 'es'
            ? 'Cambiar'
            : language === 'it'
              ? 'Cambia'
              : language === 'fr'
                ? 'Changer'
                : 'Change',
    newPrediction:
      language === 'tr'
        ? 'Yeni'
        : language === 'de'
          ? 'Neu'
          : language === 'es'
            ? 'Nuevo'
            : language === 'it'
              ? 'Nuovo'
              : language === 'fr'
                ? 'Nouveau'
                : 'New',
    disclaimer:
      language === 'tr'
        ? 'Bu tahminler bilgilendirme amaçlıdır. Bahis kararlarınız size aittir.'
        : language === 'de'
          ? 'Diese Vorhersagen dienen nur zur Information. Wettentscheidungen liegen bei Ihnen.'
          : language === 'es'
            ? 'Estas predicciones son solo informativas. Las decisiones de apuestas son tuyas.'
            : language === 'it'
              ? 'Queste previsioni sono solo informative. Le decisioni sulle scommesse sono tue.'
              : language === 'fr'
                ? 'Ces prédictions sont à titre informatif. Les décisions de paris vous appartiennent.'
                : 'These predictions are for informational purposes. Betting decisions are yours.',
    stepMatch:
      language === 'tr'
        ? 'Maç'
        : language === 'de'
          ? 'Spiel'
          : language === 'es'
            ? 'Partido'
            : language === 'it'
              ? 'Partita'
              : language === 'fr'
                ? 'Match'
                : 'Match',
    stepType:
      language === 'tr'
        ? 'Tip'
        : language === 'de'
          ? 'Typ'
          : language === 'es'
            ? 'Tipo'
            : language === 'it'
              ? 'Tipo'
              : language === 'fr'
                ? 'Type'
                : 'Type',
    stepPrediction:
      language === 'tr'
        ? 'Tahmin'
        : language === 'de'
          ? 'Vorhersage'
          : language === 'es'
            ? 'Predicción'
            : language === 'it'
              ? 'Previsione'
              : language === 'fr'
                ? 'Prédiction'
                : 'Prediction',
    matchResult:
      language === 'tr'
        ? 'Maç Sonucu'
        : language === 'de'
          ? 'Spielergebnis'
          : language === 'es'
            ? 'Resultado'
            : language === 'it'
              ? 'Risultato'
              : language === 'fr'
                ? 'Résultat'
                : 'Match Result',
    overUnder: language === 'tr' ? 'Üst/Alt' : 'Over/Under',
    bothScore: language === 'tr' ? 'KG Var/Yok' : 'BTTS',
    firstHalf:
      language === 'tr'
        ? 'İlk Yarı'
        : language === 'de'
          ? 'Erste Halbzeit'
          : language === 'es'
            ? 'Primera Mitad'
            : language === 'it'
              ? 'Primo Tempo'
              : language === 'fr'
                ? 'Mi-temps'
                : 'First Half',
    correctScore:
      language === 'tr'
        ? 'Skor Tahmini'
        : language === 'de'
          ? 'Genaues Ergebnis'
          : language === 'es'
            ? 'Marcador Exacto'
            : language === 'it'
              ? 'Risultato Esatto'
              : language === 'fr'
                ? 'Score Exact'
                : 'Correct Score',
    handicap: language === 'tr' ? 'Handikap' : 'Handicap',
    loading: language === 'tr' ? 'Maçlar yükleniyor...' : 'Loading matches...',
  }

  // Bet types with translations
  const betTypes = [
    { id: 'match_result', name: labels.matchResult, desc: '1X2', icon: Trophy },
    {
      id: 'over_under',
      name: labels.overUnder,
      desc: 'Total goals',
      icon: Hash,
    },
    { id: 'both_score', name: labels.bothScore, desc: 'BTTS', icon: Target },
    {
      id: 'first_half',
      name: labels.firstHalf,
      desc: 'HT result',
      icon: Clock,
    },
    {
      id: 'correct_score',
      name: labels.correctScore,
      desc: 'Exact score',
      icon: Zap,
    },
    {
      id: 'winner_margin',
      name: labels.handicap,
      desc: 'Goal margin',
      icon: TrendingUp,
    },
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
      <main className="w-full px-3 sm:px-4 pb-6">
        {/* Page Header */}
        <div className="py-4 sm:py-6">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent">
            {t.predictions.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t.predictions.subtitle}
          </p>
        </div>

        {/* Tabs */}
        {isAuthenticated && (
          <div className="flex gap-1 mb-4 sm:mb-6 p-1 bg-muted/30 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'ai'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Cpu className="w-4 h-4 inline mr-1.5" />
              {language === 'tr' ? 'AI Tahminleri' : 'AI Predictions'}
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'my'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-4 h-4 inline mr-1.5" />
              {language === 'tr' ? 'Tahminlerim' : 'My Predictions'}
            </button>
          </div>
        )}

        {/* My Predictions Tab */}
        {activeTab === 'my' && isAuthenticated && <MyPredictions />}

        {/* AI Predictions Tab */}
        {activeTab === 'ai' && (
          <>
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
                    <span
                      className={`text-[10px] sm:text-xs mt-0.5 ${step >= s.num ? 'text-[#0EA5E9]' : 'text-muted-foreground'}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < 2 && (
                    <ChevronRight
                      className={`w-4 h-4 ${step > s.num ? 'text-[#0EA5E9]' : 'text-muted-foreground'}`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Match Selection */}
            {step === 1 && (
              <section>
                <h2 className="text-sm sm:text-base font-semibold mb-3 text-[#0EA5E9]">
                  {labels.selectMatch}
                </h2>
                {fixturesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[#0EA5E9]" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {labels.loading}
                    </span>
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
                          <span>
                            {match.date} {match.time}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="font-medium truncate flex-1">
                            {match.home}
                          </span>
                          <span className="text-muted-foreground mx-2">vs</span>
                          <span className="font-medium truncate flex-1 text-right">
                            {match.away}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="neon-card rounded-2xl p-12 text-center">
                    <p className="text-muted-foreground text-sm">
                      {language === 'tr'
                        ? 'Şu an planlanmış maç bulunamadı. API bağlantısını kontrol edin.'
                        : 'No scheduled matches found. Please check your API connection.'}
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
                    <p className="text-[10px] text-muted-foreground">
                      {selectedMatchData.league}
                    </p>
                    <p className="text-sm font-medium">
                      <span className="text-[#0EA5E9]">
                        {selectedMatchData.home}
                      </span>
                      <span className="text-muted-foreground mx-2">vs</span>
                      <span className="text-[#0EA5E9]">
                        {selectedMatchData.away}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-xs text-muted-foreground hover:text-[#0EA5E9]"
                  >
                    {labels.change}
                  </button>
                </div>

                <h2 className="text-sm sm:text-base font-semibold mb-3 text-[#0EA5E9]">
                  {labels.betType}
                </h2>
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                  {betTypes.map((bet) => {
                    const Icon = bet.icon
                    const isSelected = selectedBetType === bet.id
                    return (
                      <button
                        key={bet.id}
                        onClick={() => handleBetTypeSelect(bet.id)}
                        className={`p-3 rounded-lg text-left transition-all border ${
                          isSelected
                            ? 'border-[#0EA5E9] bg-[#0EA5E9]/10'
                            : 'border-border bg-card hover:border-[#0EA5E9]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon
                            className={`w-4 h-4 ${isSelected ? 'text-[#0EA5E9]' : 'text-muted-foreground'}`}
                          />
                          <span
                            className={`text-xs sm:text-sm font-medium ${isSelected ? 'text-[#0EA5E9]' : ''}`}
                          >
                            {bet.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {bet.desc}
                        </p>
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
                    <p className="text-[10px] text-muted-foreground">
                      {selectedMatchData.league} • {selectedBetTypeData.name}
                    </p>
                    <p className="text-sm font-medium">
                      <span className="text-[#0EA5E9]">
                        {selectedMatchData.home}
                      </span>
                      <span className="text-muted-foreground mx-2">vs</span>
                      <span className="text-[#0EA5E9]">
                        {selectedMatchData.away}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs hover:border-[#0EA5E9]"
                  >
                    {labels.newPrediction}
                  </button>
                </div>

                {/* Prediction from API */}
                <PredictionResult
                  fixtureId={selectedMatch!}
                  homeTeamName={selectedMatchData.home}
                  awayTeamName={selectedMatchData.away}
                  league={selectedMatchData.league}
                />

                {/* Disclaimer */}
                <p className="text-center text-[10px] text-muted-foreground mt-4">
                  {labels.disclaimer}
                </p>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

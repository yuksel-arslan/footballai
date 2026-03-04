'use client'

import { use, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Trophy,
  TrendingUp,
  Lock,
  Cpu,
  BarChart3,
  Loader2,
  Check,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth/use-auth'
import { useMatchDetail, useH2H, useTeamForm } from '@/hooks/use-match-detail'
import { useAIPrediction, fetchMLPrediction } from '@/hooks/use-prediction'
import { useCreatePrediction, usePredictionComparison } from '@/hooks/use-user-predictions'
import { Skeleton } from '@/components/ui/skeleton'

interface MatchDetailPageProps {
  params: Promise<{ id: string }>
}

function FormBadge({ result }: { result: string }) {
  const colors: Record<string, string> = {
    W: 'bg-green-500 text-white',
    D: 'bg-yellow-500 text-white',
    L: 'bg-red-500 text-white',
  }
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${colors[result] || 'bg-muted text-muted-foreground'}`}
    >
      {result}
    </span>
  )
}

export default function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { id } = use(params)
  const fixtureId = parseInt(id)
  const { t, language } = useI18n()
  const { isAuthenticated } = useAuth()

  const { data: match, isLoading, isError } = useMatchDetail(fixtureId)

  const homeTeamId = match?.homeTeam?.id ?? 0
  const awayTeamId = match?.awayTeam?.id ?? 0

  const { data: h2h } = useH2H(homeTeamId, awayTeamId)
  const { data: homeForm } = useTeamForm(homeTeamId)
  const { data: awayForm } = useTeamForm(awayTeamId)

  const { data: aiPrediction } = useAIPrediction(
    fixtureId,
    match
      ? {
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          league: match.league.name,
        }
      : undefined
  )

  const createPrediction = useCreatePrediction()
  const [userPrediction, setUserPrediction] = useState<string | null>(null)
  const [userHomeScore, setUserHomeScore] = useState<string>('')
  const [userAwayScore, setUserAwayScore] = useState<string>('')

  const { data: comparison } = usePredictionComparison(fixtureId)

  const [mlPrediction, setMlPrediction] = useState<{
    homeWinProb: number
    drawProb: number
    awayWinProb: number
    predictedHomeScore: number
    predictedAwayScore: number
    confidence: number
  } | null>(null)
  const [mlLoading, setMlLoading] = useState(false)

  const handleGetMLPrediction = async () => {
    if (!match) return
    setMlLoading(true)
    try {
      const result = await fetchMLPrediction({
        fixtureId: match.id,
        homeTeamId: match.homeTeam.id,
        awayTeamId: match.awayTeam.id,
      })
      setMlPrediction(result)
    } catch {
      // silently handle
    } finally {
      setMlLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    )
  }

  if (isError || !match) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <h2 className="text-xl font-bold text-foreground mb-2">
          {t.matchDetail.notFound}
        </h2>
        <Link
          href="/matches"
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.matchDetail.backToMatches}
        </Link>
      </div>
    )
  }

  const isLive = match.status === 'LIVE' || match.status === 'HALFTIME'
  const isFinished = match.status === 'FINISHED'
  const matchDate = new Date(match.matchDate)

  const existingPrediction = match.predictions?.[0]

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-3 sm:px-4 pb-8">
        {/* Back Button */}
        <div className="py-4">
          <Link
            href="/matches"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.matchDetail.backToMatches}
          </Link>
        </div>

        {/* Match Header Card */}
        <div className="relative bg-card rounded-2xl border border-border/50 p-4 sm:p-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />

          {/* League & Status */}
          <div className="relative flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {match.league.logoUrl && (
                <Image
                  src={match.league.logoUrl}
                  alt={match.league.name}
                  width={20}
                  height={20}
                  className="rounded"
                />
              )}
              <span className="text-xs text-muted-foreground font-medium">
                {match.league.name}
              </span>
              {match.round && (
                <span className="text-xs text-muted-foreground">
                  • {match.round}
                </span>
              )}
            </div>

            {isLive ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                <div className="w-2 h-2 rounded-full bg-red-500 live-pulse" />
                <span className="text-xs font-bold text-red-500">
                  {t.matchDetail.liveNow} {match.minute}&apos;
                </span>
              </div>
            ) : isFinished ? (
              <div className="px-3 py-1 rounded-full bg-muted/50">
                <span className="text-xs font-medium text-muted-foreground">
                  {t.matches.fullTime}
                </span>
              </div>
            ) : null}
          </div>

          {/* Teams & Score */}
          <div className="relative flex items-center justify-between gap-4 sm:gap-8">
            {/* Home Team */}
            <Link
              href={`/teams/${match.homeTeam.id}`}
              className="flex-1 flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden">
                {match.homeTeam.logoUrl ? (
                  <Image
                    src={match.homeTeam.logoUrl}
                    alt={match.homeTeam.name}
                    width={56}
                    height={56}
                    className="object-contain"
                  />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">
                    {match.homeTeam.code || match.homeTeam.name.charAt(0)}
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base font-semibold text-center">
                {match.homeTeam.name}
              </p>
            </Link>

            {/* Score */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              {isLive || isFinished ? (
                <div className="flex items-center gap-3">
                  <span className="text-4xl sm:text-5xl font-bold tabular-nums">
                    {match.homeScore ?? 0}
                  </span>
                  <span className="text-2xl text-muted-foreground">-</span>
                  <span className="text-4xl sm:text-5xl font-bold tabular-nums">
                    {match.awayScore ?? 0}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold text-muted-foreground">
                    VS
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {matchDate.toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {matchDate.toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Away Team */}
            <Link
              href={`/teams/${match.awayTeam.id}`}
              className="flex-1 flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden">
                {match.awayTeam.logoUrl ? (
                  <Image
                    src={match.awayTeam.logoUrl}
                    alt={match.awayTeam.name}
                    width={56}
                    height={56}
                    className="object-contain"
                  />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">
                    {match.awayTeam.code || match.awayTeam.name.charAt(0)}
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base font-semibold text-center">
                {match.awayTeam.name}
              </p>
            </Link>
          </div>

          {/* Match Info */}
          <div className="relative flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
            {match.venue && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{match.venue}</span>
              </div>
            )}
          </div>
        </div>

        {/* Predictions Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          {/* AI Prediction */}
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">
                {t.matchDetail.aiPrediction}
              </h3>
            </div>

            {!isAuthenticated ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Lock className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  {t.matchDetail.loginRequired}
                </p>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  {t.matchDetail.loginCta}
                </Link>
              </div>
            ) : aiPrediction ? (
              <PredictionBar
                homeWinProb={aiPrediction.homeWinProb}
                drawProb={aiPrediction.drawProb}
                awayWinProb={aiPrediction.awayWinProb}
                confidence={aiPrediction.confidence}
                predictedScore={{
                  home: aiPrediction.predictedHomeScore,
                  away: aiPrediction.predictedAwayScore,
                }}
                explanation={aiPrediction.explanation}
                keyFactors={aiPrediction.keyFactors}
                t={t}
              />
            ) : existingPrediction ? (
              <PredictionBar
                homeWinProb={existingPrediction.homeWinProb}
                drawProb={existingPrediction.drawProb}
                awayWinProb={existingPrediction.awayWinProb}
                confidence={existingPrediction.confidence}
                predictedScore={{
                  home: existingPrediction.predictedHomeScore,
                  away: existingPrediction.predictedAwayScore,
                }}
                explanation={existingPrediction.explanation}
                keyFactors={existingPrediction.keyFactors}
                t={t}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t.common.loading}
              </p>
            )}
          </div>

          {/* ML Prediction */}
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-[#0EA5E9]" />
              </div>
              <h3 className="font-semibold text-sm">
                {t.matchDetail.mlPrediction}
              </h3>
              <span className="text-[10px] text-muted-foreground">
                ({t.matchDetail.poisson} + {t.matchDetail.xgboost})
              </span>
            </div>

            {mlPrediction ? (
              <PredictionBar
                homeWinProb={mlPrediction.homeWinProb}
                drawProb={mlPrediction.drawProb}
                awayWinProb={mlPrediction.awayWinProb}
                confidence={mlPrediction.confidence}
                predictedScore={{
                  home: mlPrediction.predictedHomeScore,
                  away: mlPrediction.predictedAwayScore,
                }}
                t={t}
              />
            ) : (
              <div className="flex justify-center py-4">
                <button
                  onClick={handleGetMLPrediction}
                  disabled={mlLoading}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {mlLoading ? t.common.loading : t.matchDetail.getPrediction}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* User Prediction */}
        {isAuthenticated && !isFinished && (
          <div className="bg-card rounded-xl border border-border/50 p-4 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#FBBF24]/10 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-[#FBBF24]" />
              </div>
              <h3 className="font-semibold text-sm">
                {language === 'tr' ? 'Senin Tahminin' : 'Your Prediction'}
              </h3>
              {userPrediction && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                  <Check className="w-3 h-3 inline mr-0.5" />
                  {language === 'tr' ? 'Gönderildi' : 'Submitted'}
                </span>
              )}
            </div>

            {/* Score Prediction */}
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2 text-center">
                {language === 'tr' ? 'Skor Tahmini (Opsiyonel)' : 'Score Prediction (Optional)'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                    {match.homeTeam.code || match.homeTeam.name.split(' ')[0]}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={userHomeScore}
                    onChange={(e) => setUserHomeScore(e.target.value)}
                    className="w-14 h-10 text-center text-lg font-bold rounded-lg border border-border bg-muted/30 focus:border-[#FBBF24] focus:outline-none transition-colors"
                    placeholder="-"
                  />
                </div>
                <span className="text-lg text-muted-foreground font-bold mt-4">-</span>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                    {match.awayTeam.code || match.awayTeam.name.split(' ')[0]}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={userAwayScore}
                    onChange={(e) => setUserAwayScore(e.target.value)}
                    className="w-14 h-10 text-center text-lg font-bold rounded-lg border border-border bg-muted/30 focus:border-[#FBBF24] focus:outline-none transition-colors"
                    placeholder="-"
                  />
                </div>
              </div>
            </div>

            {/* Result Prediction */}
            <p className="text-xs text-muted-foreground mb-2 text-center">
              {language === 'tr' ? 'Maç Sonucu' : 'Match Result'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  value: 'home',
                  label:
                    match.homeTeam.code || match.homeTeam.name.split(' ')[0],
                },
                {
                  value: 'draw',
                  label: language === 'tr' ? 'Berabere' : 'Draw',
                },
                {
                  value: 'away',
                  label:
                    match.awayTeam.code || match.awayTeam.name.split(' ')[0],
                },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={async () => {
                    setUserPrediction(value)
                    try {
                      await createPrediction.mutateAsync({
                        fixtureId: match.id,
                        predictedResult: value as 'home' | 'draw' | 'away',
                        predictedHomeScore: userHomeScore ? parseInt(userHomeScore) : undefined,
                        predictedAwayScore: userAwayScore ? parseInt(userAwayScore) : undefined,
                      })
                    } catch {
                      // Keep the UI state
                    }
                  }}
                  disabled={createPrediction.isPending}
                  className={`p-3 rounded-xl text-center transition-all border ${
                    userPrediction === value
                      ? 'border-[#FBBF24] bg-[#FBBF24]/10 text-[#FBBF24]'
                      : 'border-border bg-card hover:border-[#FBBF24]/50'
                  }`}
                >
                  {createPrediction.isPending && userPrediction === value ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    <p className="text-sm font-medium">{label}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Prediction Comparison (after match finishes) */}
        {isFinished && comparison && (comparison.aiPrediction || comparison.userPrediction) && (
          <div className="bg-card rounded-xl border border-border/50 p-4 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">
                {language === 'tr' ? 'Tahmin Karşılaştırması' : 'Prediction Comparison'}
              </h3>
            </div>

            {/* Actual Result */}
            <div className="text-center mb-4 p-3 rounded-xl bg-muted/30">
              <p className="text-[10px] text-muted-foreground mb-1">
                {language === 'tr' ? 'Gerçek Sonuç' : 'Actual Result'}
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {match.homeScore} - {match.awayScore}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {comparison.actualResult === 'home'
                  ? match.homeTeam.name
                  : comparison.actualResult === 'away'
                    ? match.awayTeam.name
                    : language === 'tr' ? 'Berabere' : 'Draw'}
              </p>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* AI Prediction */}
              {comparison.aiPrediction && (
                <div className={`rounded-xl p-3 border ${comparison.aiPrediction.wasCorrect ? 'border-green-500/30 bg-green-500/5' : comparison.aiPrediction.wasCorrect === false ? 'border-red-500/30 bg-red-500/5' : 'border-border'}`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Cpu className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold">AI</span>
                    {comparison.aiPrediction.wasCorrect === true && (
                      <Check className="w-3.5 h-3.5 text-green-500 ml-auto" />
                    )}
                    {comparison.aiPrediction.wasCorrect === false && (
                      <span className="text-red-500 text-[10px] ml-auto">✗</span>
                    )}
                  </div>
                  <p className="text-lg font-bold tabular-nums text-center">
                    {Math.round(comparison.aiPrediction.predictedHomeScore)} - {Math.round(comparison.aiPrediction.predictedAwayScore)}
                  </p>
                  <p className="text-[10px] text-center text-muted-foreground mt-1">
                    {comparison.aiPrediction.predictedResult === 'home'
                      ? match.homeTeam.name
                      : comparison.aiPrediction.predictedResult === 'away'
                        ? match.awayTeam.name
                        : language === 'tr' ? 'Berabere' : 'Draw'}
                  </p>
                  {comparison.aiPrediction.scoreCorrect && (
                    <p className="text-[10px] text-center text-green-500 font-semibold mt-1">
                      {language === 'tr' ? 'Skor Tuttu!' : 'Exact Score!'}
                    </p>
                  )}
                </div>
              )}

              {/* User Prediction */}
              {comparison.userPrediction && (
                <div className={`rounded-xl p-3 border ${comparison.userPrediction.wasCorrect ? 'border-green-500/30 bg-green-500/5' : comparison.userPrediction.wasCorrect === false ? 'border-red-500/30 bg-red-500/5' : 'border-border'}`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Trophy className="w-3.5 h-3.5 text-[#FBBF24]" />
                    <span className="text-xs font-semibold">{language === 'tr' ? 'Sen' : 'You'}</span>
                    {comparison.userPrediction.wasCorrect === true && (
                      <Check className="w-3.5 h-3.5 text-green-500 ml-auto" />
                    )}
                    {comparison.userPrediction.wasCorrect === false && (
                      <span className="text-red-500 text-[10px] ml-auto">✗</span>
                    )}
                  </div>
                  {comparison.userPrediction.predictedHomeScore !== null ? (
                    <p className="text-lg font-bold tabular-nums text-center">
                      {comparison.userPrediction.predictedHomeScore} - {comparison.userPrediction.predictedAwayScore}
                    </p>
                  ) : (
                    <p className="text-sm text-center text-muted-foreground">—</p>
                  )}
                  <p className="text-[10px] text-center text-muted-foreground mt-1">
                    {comparison.userPrediction.predictedResult === 'home'
                      ? match.homeTeam.name
                      : comparison.userPrediction.predictedResult === 'away'
                        ? match.awayTeam.name
                        : language === 'tr' ? 'Berabere' : 'Draw'}
                  </p>
                  {comparison.userPrediction.scoreCorrect && (
                    <p className="text-[10px] text-center text-green-500 font-semibold mt-1">
                      {language === 'tr' ? 'Skor Tuttu!' : 'Exact Score!'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* H2H & Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* H2H */}
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-[#FBBF24]" />
              <h3 className="font-semibold text-sm">{t.matchDetail.h2h}</h3>
            </div>

            {h2h?.summary ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-green-500/10 rounded-lg p-3">
                    <p className="text-2xl font-bold text-green-500">
                      {h2h.summary.team1Wins}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {match.homeTeam.code || match.homeTeam.name.split(' ')[0]}
                    </p>
                  </div>
                  <div className="bg-yellow-500/10 rounded-lg p-3">
                    <p className="text-2xl font-bold text-yellow-500">
                      {h2h.summary.draws}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {t.matchDetail.draws}
                    </p>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-3">
                    <p className="text-2xl font-bold text-red-500">
                      {h2h.summary.team2Wins}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {match.awayTeam.code || match.awayTeam.name.split(' ')[0]}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  {t.matchDetail.totalGames}: {h2h.summary.totalGames}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t.common.loading}
              </p>
            )}

            {/* H2H History */}
            {h2h?.history && h2h.history.length > 0 && (
              <div className="mt-4 space-y-2">
                {h2h.history.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-xs py-1.5 border-t border-border/30"
                  >
                    <span className="text-muted-foreground w-20 truncate">
                      {new Date(m.matchDate).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate max-w-[80px]">
                        {m.homeTeam.name.split(' ')[0]}
                      </span>
                      <span className="font-bold tabular-nums">
                        {m.homeScore ?? '-'} - {m.awayScore ?? '-'}
                      </span>
                      <span className="font-medium truncate max-w-[80px]">
                        {m.awayTeam.name.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Form */}
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">
                {t.matchDetail.recentForm}
              </h3>
            </div>

            <div className="space-y-4">
              {/* Home Team Form */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {match.homeTeam.logoUrl && (
                    <Image
                      src={match.homeTeam.logoUrl}
                      alt={match.homeTeam.name}
                      width={16}
                      height={16}
                      className="rounded"
                    />
                  )}
                  <span className="text-xs font-medium">
                    {match.homeTeam.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ({t.matchDetail.last5})
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {homeForm?.form
                    ? homeForm.form.map((r, i) => (
                        <FormBadge key={i} result={r} />
                      ))
                    : Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="w-7 h-7 rounded-full" />
                      ))}
                </div>
              </div>

              {/* Away Team Form */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {match.awayTeam.logoUrl && (
                    <Image
                      src={match.awayTeam.logoUrl}
                      alt={match.awayTeam.name}
                      width={16}
                      height={16}
                      className="rounded"
                    />
                  )}
                  <span className="text-xs font-medium">
                    {match.awayTeam.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ({t.matchDetail.last5})
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {awayForm?.form
                    ? awayForm.form.map((r, i) => (
                        <FormBadge key={i} result={r} />
                      ))
                    : Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="w-7 h-7 rounded-full" />
                      ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function PredictionBar({
  homeWinProb,
  drawProb,
  awayWinProb,
  confidence,
  predictedScore,
  explanation,
  keyFactors,
  t,
}: {
  homeWinProb: number
  drawProb: number
  awayWinProb: number
  confidence: number
  predictedScore: { home: number; away: number }
  explanation?: string
  keyFactors?:
    | string[]
    | { factor: string; impact: number; description: string }[]
  t: ReturnType<typeof useI18n>['t']
}) {
  const homePercent = Math.round(homeWinProb)
  const drawPercent = Math.round(drawProb)
  const awayPercent = Math.round(awayWinProb)

  return (
    <div className="space-y-3">
      {/* Predicted Score */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-1">
          {t.predictions.predictedScore}
        </p>
        <p className="text-lg font-bold tabular-nums">
          {predictedScore.home.toFixed(1)} - {predictedScore.away.toFixed(1)}
        </p>
      </div>

      {/* Probability Bar */}
      <div>
        <div className="flex h-2.5 rounded-full overflow-hidden bg-muted/50">
          <div
            className="bg-green-500 transition-all duration-500"
            style={{ width: `${homePercent}%` }}
          />
          <div
            className="bg-yellow-500 transition-all duration-500"
            style={{ width: `${drawPercent}%` }}
          />
          <div
            className="bg-red-500 transition-all duration-500"
            style={{ width: `${awayPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs font-medium">
          <span className="text-green-500">
            {t.predictions.homeWin} %{homePercent}
          </span>
          <span className="text-yellow-500">
            {t.predictions.draw} %{drawPercent}
          </span>
          <span className="text-red-500">
            {t.predictions.awayWin} %{awayPercent}
          </span>
        </div>
      </div>

      {/* Confidence */}
      <div className="text-center">
        <span className="text-xs text-primary font-semibold">
          {t.predictions.confidence}: %{Math.round(confidence)}
        </span>
      </div>

      {/* Explanation */}
      {explanation && (
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs font-semibold text-muted-foreground mb-1">
            {t.predictions.whyThisPrediction}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {explanation}
          </p>
          {keyFactors && keyFactors.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {keyFactors.map((factor, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground flex items-start gap-1"
                >
                  <span className="text-primary mt-0.5">•</span>
                  {typeof factor === 'string' ? factor : factor.description}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

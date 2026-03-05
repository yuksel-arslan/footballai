'use client'

import { use, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  MapPin,
  Trophy,
  TrendingUp,
  Lock,
  Cpu,
  BarChart3,
  Loader2,
  Check,
  Swords,
  Clock,
  Target,
  Users,
  Shield,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth/use-auth'
import { useMatchDetail, useH2H, useTeamForm } from '@/hooks/use-match-detail'
import { useTeamStats } from '@/hooks/use-team-detail'
import { useAIPrediction, fetchMLPrediction } from '@/hooks/use-prediction'
import {
  useCreatePrediction,
  usePredictionComparison,
} from '@/hooks/use-user-predictions'
import { Skeleton } from '@/components/ui/skeleton'

interface MatchDetailPageProps {
  params: Promise<{ id: string }>
}

function FormBadge({ result }: { result: string }) {
  const styles: Record<string, { bg: string; shadow: string }> = {
    W: { bg: '#10B981', shadow: 'rgba(16, 185, 129, 0.5)' },
    D: { bg: '#FBBF24', shadow: 'rgba(251, 191, 36, 0.5)' },
    L: { bg: '#EF4444', shadow: 'rgba(239, 68, 68, 0.5)' },
  }
  const style = styles[result] || { bg: '#6b7280', shadow: 'transparent' }
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center"
      style={{ background: style.bg, boxShadow: `0 0 10px ${style.shadow}` }}
    >
      <span className="text-xs font-bold text-white">{result}</span>
    </div>
  )
}

type TabType = 'predictions' | 'h2h' | 'form'

export default function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { id } = use(params)
  const fixtureId = parseInt(id)
  const { t, language } = useI18n()
  const { isAuthenticated } = useAuth()

  const { data: match, isLoading, isError } = useMatchDetail(fixtureId)

  const homeTeamId = match?.homeTeam?.id ?? 0
  const awayTeamId = match?.awayTeam?.id ?? 0

  const { data: h2h, isLoading: h2hLoading } = useH2H(homeTeamId, awayTeamId)
  const { data: homeForm } = useTeamForm(homeTeamId)
  const { data: awayForm } = useTeamForm(awayTeamId)
  const { data: homeStats } = useTeamStats(homeTeamId)
  const { data: awayStats } = useTeamStats(awayTeamId)

  const { data: aiPrediction } = useAIPrediction(
    fixtureId,
    match
      ? {
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          league: match.league.name,
          round: match.round ?? undefined,
          homeTeamId: match.homeTeam.id,
          awayTeamId: match.awayTeam.id,
          homeForm: homeForm?.form,
          awayForm: awayForm?.form,
          homePosition: homeStats?.leaguePosition ?? undefined,
          awayPosition: awayStats?.leaguePosition ?? undefined,
          h2hResults: h2h?.history?.slice(0, 5).map((m) => {
            if (
              m.homeScore === null ||
              m.homeScore === undefined ||
              m.awayScore === null ||
              m.awayScore === undefined
            )
              return '-'
            return `${m.homeTeam.name.split(' ')[0]} ${m.homeScore}-${m.awayScore} ${m.awayTeam.name.split(' ')[0]}`
          }),
          homeStats: homeStats
            ? {
                wins: homeStats.wins,
                draws: homeStats.draws,
                losses: homeStats.losses,
                goalsFor: homeStats.goalsFor,
                goalsAgainst: homeStats.goalsAgainst,
              }
            : undefined,
          awayStats: awayStats
            ? {
                wins: awayStats.wins,
                draws: awayStats.draws,
                losses: awayStats.losses,
                goalsFor: awayStats.goalsFor,
                goalsAgainst: awayStats.goalsAgainst,
              }
            : undefined,
        }
      : undefined
  )

  const createPrediction = useCreatePrediction()
  const [userPrediction, setUserPrediction] = useState<string | null>(null)
  const [userHomeScore, setUserHomeScore] = useState<string>('')
  const [userAwayScore, setUserAwayScore] = useState<string>('')
  const [activeTab, setActiveTab] = useState<TabType>('predictions')

  const { data: comparison } = usePredictionComparison(fixtureId)

  const [mlPrediction, setMlPrediction] = useState<{
    homeWinProb: number
    drawProb: number
    awayWinProb: number
    predictedHomeScore: number
    predictedAwayScore: number
    confidence: number
    explanation?: string
    keyFactors?: string[]
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

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="w-full px-3 sm:px-4 py-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="neon-card rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex flex-col items-center gap-3">
                <Skeleton className="w-16 h-16 rounded-xl" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-12 w-24" />
              <div className="flex-1 flex flex-col items-center gap-3">
                <Skeleton className="w-16 h-16 rounded-xl" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-60 rounded-xl" />
            <Skeleton className="h-60 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  // Error State
  if (isError || !match) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-20 px-4">
        <div className="neon-card rounded-2xl p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">{t.matchDetail.notFound}</h2>
          <Link
            href="/matches"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
              color: 'white',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t.matchDetail.backToMatches}
          </Link>
        </div>
      </div>
    )
  }

  const isLive = match.status === 'LIVE' || match.status === 'HALFTIME'
  const isFinished = match.status === 'FINISHED'
  const matchDate = new Date(match.matchDate)

  const existingPrediction = match.predictions?.[0]

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'predictions',
      label: language === 'tr' ? 'Tahminler' : 'Predictions',
      icon: <Cpu className="w-3.5 h-3.5" />,
    },
    {
      id: 'h2h',
      label: t.matchDetail.h2h,
      icon: <Swords className="w-3.5 h-3.5" />,
    },
    {
      id: 'form',
      label: t.matchDetail.recentForm,
      icon: <TrendingUp className="w-3.5 h-3.5" />,
    },
  ]

  return (
    <div className="min-h-screen">
      <main className="w-full px-3 sm:px-4 pb-8">
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

        {/* ── Match Header Card ── */}
        <div className="relative neon-card rounded-2xl overflow-hidden">
          {/* Background Gradient */}
          <div className="absolute inset-0">
            <div
              className="absolute top-0 left-1/4 w-[300px] h-[300px] rounded-full blur-[100px] opacity-15"
              style={{
                background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
              }}
            />
            <div
              className="absolute bottom-0 right-1/4 w-[200px] h-[200px] rounded-full blur-[80px] opacity-10"
              style={{
                background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
              }}
            />
          </div>

          <div className="relative p-4 sm:p-6 lg:p-8">
            {/* League & Status Bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                {match.league.logoUrl && (
                  <Image
                    src={match.league.logoUrl}
                    alt={match.league.name}
                    width={24}
                    height={24}
                    className="rounded"
                  />
                )}
                <span className="text-sm font-medium text-muted-foreground">
                  {match.league.name}
                </span>
                {match.round && (
                  <span className="text-xs text-muted-foreground/60">
                    {match.round}
                  </span>
                )}
              </div>

              {isLive ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-live-pulse" />
                  <span className="text-xs font-bold text-red-500">
                    {t.matchDetail.liveNow} {match.minute}&apos;
                  </span>
                </div>
              ) : isFinished ? (
                <div className="px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t.matches.fullTime}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0EA5E9]/10 border border-[#0EA5E9]/20">
                  <Clock className="w-3 h-3 text-[#0EA5E9]" />
                  <span className="text-xs font-medium text-[#0EA5E9]">
                    {matchDate.toLocaleDateString(
                      language === 'tr' ? 'tr-TR' : 'en-US',
                      {
                        day: 'numeric',
                        month: 'short',
                      }
                    )}{' '}
                    {matchDate.toLocaleTimeString(
                      language === 'tr' ? 'tr-TR' : 'en-US',
                      {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      }
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Teams & Score */}
            <div className="flex items-center justify-between gap-3 sm:gap-8">
              {/* Home Team */}
              <Link
                href={`/teams/${match.homeTeam.id}`}
                className="flex-1 flex flex-col items-center gap-2 sm:gap-3 hover:scale-[1.02] transition-transform"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-muted/30 flex items-center justify-center overflow-hidden border border-border/30">
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
                <p className="text-xs sm:text-sm font-semibold text-center leading-tight">
                  {match.homeTeam.name}
                </p>
              </Link>

              {/* Score / VS */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                {isLive || isFinished ? (
                  <>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <span
                        className="text-4xl sm:text-5xl font-extrabold tabular-nums"
                        style={{
                          textShadow: isLive
                            ? '0 0 20px rgba(239, 68, 68, 0.3)'
                            : '0 0 15px rgba(14, 165, 233, 0.3)',
                        }}
                      >
                        {match.homeScore ?? 0}
                      </span>
                      <span className="text-xl sm:text-2xl text-muted-foreground/50 font-light">
                        :
                      </span>
                      <span
                        className="text-4xl sm:text-5xl font-extrabold tabular-nums"
                        style={{
                          textShadow: isLive
                            ? '0 0 20px rgba(239, 68, 68, 0.3)'
                            : '0 0 15px rgba(14, 165, 233, 0.3)',
                        }}
                      >
                        {match.awayScore ?? 0}
                      </span>
                    </div>
                    {isLive && match.status === 'HALFTIME' && (
                      <span className="text-[10px] font-medium text-yellow-500 mt-1">
                        {language === 'tr' ? 'Devre Arası' : 'Half Time'}
                      </span>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent">
                      VS
                    </span>
                  </div>
                )}
              </div>

              {/* Away Team */}
              <Link
                href={`/teams/${match.awayTeam.id}`}
                className="flex-1 flex flex-col items-center gap-2 sm:gap-3 hover:scale-[1.02] transition-transform"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-muted/30 flex items-center justify-center overflow-hidden border border-border/30">
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
                <p className="text-xs sm:text-sm font-semibold text-center leading-tight">
                  {match.awayTeam.name}
                </p>
              </Link>
            </div>

            {/* Match Info (Venue, Referee, Round) */}
            <div className="flex items-center justify-center gap-4 mt-4 flex-wrap text-xs text-muted-foreground/70">
              {match.venue && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  <span>{match.venue}</span>
                </div>
              )}
              {match.referee && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{match.referee}</span>
                </div>
              )}
              {match.round && (
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span>{match.round}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-6 mb-4 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'glass-card border border-border/30 text-muted-foreground hover:text-foreground hover:border-[#0EA5E9]/30'
              }`}
              style={
                activeTab === tab.id
                  ? {
                      background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
                    }
                  : {}
              }
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Predictions Tab ── */}
        {activeTab === 'predictions' && (
          <div className="space-y-4">
            {/* AI & ML Predictions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* AI Prediction */}
              <div className="neon-card rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(37, 99, 235, 0.1)' }}
                  >
                    <Cpu className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">
                      {t.matchDetail.aiPrediction}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      Gemini AI
                    </p>
                  </div>
                </div>

                {!isAuthenticated ? (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      {t.matchDetail.loginRequired}
                    </p>
                    <Link
                      href="/login"
                      className="px-5 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
                      style={{
                        background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
                      }}
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
                    homeTeam={match.homeTeam.name}
                    awayTeam={match.awayTeam.name}
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
                    homeTeam={match.homeTeam.name}
                    awayTeam={match.awayTeam.name}
                    t={t}
                  />
                ) : (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-[#0EA5E9]" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {t.common.loading}
                    </span>
                  </div>
                )}
              </div>

              {/* ML Prediction */}
              <div className="neon-card rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(14, 165, 233, 0.1)' }}
                  >
                    <BarChart3 className="w-4 h-4 text-[#0EA5E9]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">
                      {t.matchDetail.mlPrediction}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      {t.matchDetail.poisson} + {t.matchDetail.xgboost}
                    </p>
                  </div>
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
                    explanation={mlPrediction.explanation}
                    keyFactors={mlPrediction.keyFactors}
                    homeTeam={match.homeTeam.name}
                    awayTeam={match.awayTeam.name}
                    t={t}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <div className="w-12 h-12 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-[#0EA5E9]/50" />
                    </div>
                    <button
                      onClick={handleGetMLPrediction}
                      disabled={mlLoading}
                      className="px-5 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, #0EA5E9, #10B981)',
                      }}
                    >
                      {mlLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t.common.loading}
                        </span>
                      ) : (
                        t.matchDetail.getPrediction
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* User Prediction */}
            {isAuthenticated && !isFinished && (
              <div className="neon-card rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(251, 191, 36, 0.1)' }}
                  >
                    <Trophy className="w-4 h-4 text-[#FBBF24]" />
                  </div>
                  <h3 className="font-semibold text-sm">
                    {language === 'tr' ? 'Senin Tahminin' : 'Your Prediction'}
                  </h3>
                  {userPrediction && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 ml-auto">
                      <Check className="w-3 h-3 inline mr-0.5" />
                      {language === 'tr' ? 'Gönderildi' : 'Submitted'}
                    </span>
                  )}
                </div>

                {/* Score Prediction */}
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-3 text-center">
                    {language === 'tr'
                      ? 'Skor Tahmini (Opsiyonel)'
                      : 'Score Prediction (Optional)'}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                        {match.homeTeam.code ||
                          match.homeTeam.name.split(' ')[0]}
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="15"
                        value={userHomeScore}
                        onChange={(e) => setUserHomeScore(e.target.value)}
                        className="w-14 h-12 text-center text-xl font-bold rounded-xl border border-border/50 bg-muted/20 focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]/30 focus:outline-none transition-all"
                        placeholder="-"
                      />
                    </div>
                    <span className="text-xl text-muted-foreground/50 font-light mt-5">
                      :
                    </span>
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                        {match.awayTeam.code ||
                          match.awayTeam.name.split(' ')[0]}
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="15"
                        value={userAwayScore}
                        onChange={(e) => setUserAwayScore(e.target.value)}
                        className="w-14 h-12 text-center text-xl font-bold rounded-xl border border-border/50 bg-muted/20 focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]/30 focus:outline-none transition-all"
                        placeholder="-"
                      />
                    </div>
                  </div>
                </div>

                {/* Result Prediction */}
                <p className="text-xs text-muted-foreground mb-3 text-center">
                  {language === 'tr' ? 'Maç Sonucu' : 'Match Result'}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    {
                      value: 'home',
                      label:
                        match.homeTeam.code ||
                        match.homeTeam.name.split(' ')[0],
                      color: '#10B981',
                    },
                    {
                      value: 'draw',
                      label: language === 'tr' ? 'Berabere' : 'Draw',
                      color: '#FBBF24',
                    },
                    {
                      value: 'away',
                      label:
                        match.awayTeam.code ||
                        match.awayTeam.name.split(' ')[0],
                      color: '#EF4444',
                    },
                  ].map(({ value, label, color }) => (
                    <button
                      key={value}
                      onClick={async () => {
                        setUserPrediction(value)
                        try {
                          await createPrediction.mutateAsync({
                            fixtureId: match.id,
                            predictedResult: value as 'home' | 'draw' | 'away',
                            predictedHomeScore: userHomeScore
                              ? parseInt(userHomeScore)
                              : undefined,
                            predictedAwayScore: userAwayScore
                              ? parseInt(userAwayScore)
                              : undefined,
                          })
                        } catch {
                          // Keep the UI state
                        }
                      }}
                      disabled={createPrediction.isPending}
                      className={`p-3 sm:p-4 rounded-xl text-center transition-all border ${
                        userPrediction === value
                          ? 'border-[#FBBF24] bg-[#FBBF24]/10'
                          : 'border-border/30 bg-card/50 hover:border-[#FBBF24]/40 hover:bg-[#FBBF24]/5'
                      }`}
                      style={
                        userPrediction === value
                          ? {
                              boxShadow: `0 0 15px ${color}20`,
                            }
                          : {}
                      }
                    >
                      {createPrediction.isPending &&
                      userPrediction === value ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        <p
                          className={`text-sm font-semibold ${userPrediction === value ? 'text-[#FBBF24]' : ''}`}
                        >
                          {label}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Prediction Comparison (after match finishes) */}
            {isFinished &&
              comparison &&
              (comparison.aiPrediction || comparison.userPrediction) && (
                <div className="neon-card rounded-xl p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(37, 99, 235, 0.1)' }}
                    >
                      <BarChart3 className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">
                      {language === 'tr'
                        ? 'Tahmin Karşılaştırması'
                        : 'Prediction Comparison'}
                    </h3>
                  </div>

                  {/* Actual Result */}
                  <div className="text-center mb-4 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10">
                    <p className="text-[10px] text-muted-foreground mb-1">
                      {language === 'tr' ? 'Gerçek Sonuç' : 'Actual Result'}
                    </p>
                    <p
                      className="text-3xl font-extrabold tabular-nums"
                      style={{
                        textShadow: '0 0 15px rgba(14, 165, 233, 0.3)',
                      }}
                    >
                      {match.homeScore} - {match.awayScore}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {comparison.actualResult === 'home'
                        ? match.homeTeam.name
                        : comparison.actualResult === 'away'
                          ? match.awayTeam.name
                          : language === 'tr'
                            ? 'Berabere'
                            : 'Draw'}
                    </p>
                  </div>

                  {/* Comparison Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* AI Prediction */}
                    {comparison.aiPrediction && (
                      <div
                        className={`rounded-xl p-4 border ${comparison.aiPrediction.wasCorrect ? 'border-green-500/30 bg-green-500/5' : comparison.aiPrediction.wasCorrect === false ? 'border-red-500/30 bg-red-500/5' : 'border-border/30'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-3">
                          <Cpu className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-semibold">AI</span>
                          {comparison.aiPrediction.wasCorrect === true && (
                            <Check className="w-3.5 h-3.5 text-green-500 ml-auto" />
                          )}
                          {comparison.aiPrediction.wasCorrect === false && (
                            <span className="text-red-500 text-xs ml-auto">
                              ✗
                            </span>
                          )}
                        </div>
                        <p className="text-xl font-bold tabular-nums text-center">
                          {Math.round(
                            comparison.aiPrediction.predictedHomeScore
                          )}{' '}
                          -{' '}
                          {Math.round(
                            comparison.aiPrediction.predictedAwayScore
                          )}
                        </p>
                        <p className="text-[10px] text-center text-muted-foreground mt-1">
                          {comparison.aiPrediction.predictedResult === 'home'
                            ? match.homeTeam.name
                            : comparison.aiPrediction.predictedResult === 'away'
                              ? match.awayTeam.name
                              : language === 'tr'
                                ? 'Berabere'
                                : 'Draw'}
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
                      <div
                        className={`rounded-xl p-4 border ${comparison.userPrediction.wasCorrect ? 'border-green-500/30 bg-green-500/5' : comparison.userPrediction.wasCorrect === false ? 'border-red-500/30 bg-red-500/5' : 'border-border/30'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-3">
                          <Trophy className="w-3.5 h-3.5 text-[#FBBF24]" />
                          <span className="text-xs font-semibold">
                            {language === 'tr' ? 'Sen' : 'You'}
                          </span>
                          {comparison.userPrediction.wasCorrect === true && (
                            <Check className="w-3.5 h-3.5 text-green-500 ml-auto" />
                          )}
                          {comparison.userPrediction.wasCorrect === false && (
                            <span className="text-red-500 text-xs ml-auto">
                              ✗
                            </span>
                          )}
                        </div>
                        {comparison.userPrediction.predictedHomeScore !==
                        null ? (
                          <p className="text-xl font-bold tabular-nums text-center">
                            {comparison.userPrediction.predictedHomeScore} -{' '}
                            {comparison.userPrediction.predictedAwayScore}
                          </p>
                        ) : (
                          <p className="text-lg text-center text-muted-foreground">
                            —
                          </p>
                        )}
                        <p className="text-[10px] text-center text-muted-foreground mt-1">
                          {comparison.userPrediction.predictedResult === 'home'
                            ? match.homeTeam.name
                            : comparison.userPrediction.predictedResult ===
                                'away'
                              ? match.awayTeam.name
                              : language === 'tr'
                                ? 'Berabere'
                                : 'Draw'}
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
          </div>
        )}

        {/* ── H2H Tab ── */}
        {activeTab === 'h2h' && (
          <div className="neon-card rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(251, 191, 36, 0.1)' }}
              >
                <Swords className="w-4 h-4 text-[#FBBF24]" />
              </div>
              <h3 className="font-semibold text-sm">{t.matchDetail.h2h}</h3>
            </div>

            {h2hLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-[#0EA5E9]" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {t.common.loading}
                </span>
              </div>
            ) : h2h?.summary ? (
              <div className="space-y-5">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl p-4 bg-green-500/5 border border-green-500/20">
                    <p
                      className="text-3xl font-extrabold text-green-500"
                      style={{
                        textShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
                      }}
                    >
                      {h2h.summary.team1Wins}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {match.homeTeam.code || match.homeTeam.name.split(' ')[0]}
                    </p>
                  </div>
                  <div className="rounded-xl p-4 bg-yellow-500/5 border border-yellow-500/20">
                    <p
                      className="text-3xl font-extrabold text-yellow-500"
                      style={{
                        textShadow: '0 0 15px rgba(251, 191, 36, 0.4)',
                      }}
                    >
                      {h2h.summary.draws}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.matchDetail.draws}
                    </p>
                  </div>
                  <div className="rounded-xl p-4 bg-red-500/5 border border-red-500/20">
                    <p
                      className="text-3xl font-extrabold text-red-500"
                      style={{
                        textShadow: '0 0 15px rgba(239, 68, 68, 0.4)',
                      }}
                    >
                      {h2h.summary.team2Wins}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {match.awayTeam.code || match.awayTeam.name.split(' ')[0]}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  {t.matchDetail.totalGames}: {h2h.summary.totalGames}
                </p>

                {/* H2H Progress Bar */}
                {h2h.summary.totalGames > 0 && (
                  <div className="flex h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-green-500 transition-all"
                      style={{
                        width: `${(h2h.summary.team1Wins / h2h.summary.totalGames) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-yellow-500 transition-all"
                      style={{
                        width: `${(h2h.summary.draws / h2h.summary.totalGames) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-red-500 transition-all"
                      style={{
                        width: `${(h2h.summary.team2Wins / h2h.summary.totalGames) * 100}%`,
                      }}
                    />
                  </div>
                )}

                {/* H2H History */}
                {h2h.history && h2h.history.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    <p className="text-xs text-muted-foreground font-medium mb-2">
                      {language === 'tr' ? 'Son Maçlar' : 'Recent Matches'}
                    </p>
                    {h2h.history.slice(0, 5).map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between text-xs py-2.5 px-3 rounded-lg bg-card/30 border border-border/20"
                      >
                        <span className="text-muted-foreground w-16 truncate">
                          {new Date(m.matchDate).toLocaleDateString(
                            language === 'tr' ? 'tr-TR' : 'en-US',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: '2-digit',
                            }
                          )}
                        </span>
                        <div className="flex items-center gap-2 flex-1 justify-center">
                          <span className="font-medium truncate max-w-[90px] text-right">
                            {m.homeTeam.name}
                          </span>
                          <span className="font-bold tabular-nums px-2 py-0.5 rounded bg-muted/30">
                            {m.homeScore ?? '-'} - {m.awayScore ?? '-'}
                          </span>
                          <span className="font-medium truncate max-w-[90px]">
                            {m.awayTeam.name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Trophy className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {language === 'tr'
                    ? 'Karşılaşma verisi bulunamadı'
                    : 'No head-to-head data available'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Form Tab ── */}
        {activeTab === 'form' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Home Team Form */}
            <div className="neon-card rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                {match.homeTeam.logoUrl && (
                  <Image
                    src={match.homeTeam.logoUrl}
                    alt={match.homeTeam.name}
                    width={20}
                    height={20}
                    className="rounded"
                  />
                )}
                <h3 className="font-semibold text-sm">{match.homeTeam.name}</h3>
                <span className="text-[10px] text-muted-foreground">
                  ({t.matchDetail.last5})
                </span>
              </div>
              {/* Form Badges */}
              <div className="flex gap-2 mb-4">
                {homeForm?.form
                  ? homeForm.form.map((r, i) => (
                      <FormBadge key={i} result={r} />
                    ))
                  : Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="w-7 h-7 rounded-full" />
                    ))}
              </div>
              {/* Recent Matches */}
              {homeForm?.matches && homeForm.matches.length > 0 && (
                <div className="space-y-1.5">
                  {homeForm.matches.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-card/30 border border-border/20"
                    >
                      <span className="text-muted-foreground w-14 truncate">
                        {new Date(m.matchDate).toLocaleDateString(
                          language === 'tr' ? 'tr-TR' : 'en-US',
                          {
                            day: 'numeric',
                            month: 'short',
                          }
                        )}
                      </span>
                      <div className="flex items-center gap-1.5 flex-1 justify-center">
                        <span className="font-medium truncate max-w-[80px] text-right">
                          {m.homeTeam.name.split(' ')[0]}
                        </span>
                        <span className="font-bold tabular-nums px-1.5 py-0.5 rounded bg-muted/30">
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

            {/* Away Team Form */}
            <div className="neon-card rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                {match.awayTeam.logoUrl && (
                  <Image
                    src={match.awayTeam.logoUrl}
                    alt={match.awayTeam.name}
                    width={20}
                    height={20}
                    className="rounded"
                  />
                )}
                <h3 className="font-semibold text-sm">{match.awayTeam.name}</h3>
                <span className="text-[10px] text-muted-foreground">
                  ({t.matchDetail.last5})
                </span>
              </div>
              {/* Form Badges */}
              <div className="flex gap-2 mb-4">
                {awayForm?.form
                  ? awayForm.form.map((r, i) => (
                      <FormBadge key={i} result={r} />
                    ))
                  : Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="w-7 h-7 rounded-full" />
                    ))}
              </div>
              {/* Recent Matches */}
              {awayForm?.matches && awayForm.matches.length > 0 && (
                <div className="space-y-1.5">
                  {awayForm.matches.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-card/30 border border-border/20"
                    >
                      <span className="text-muted-foreground w-14 truncate">
                        {new Date(m.matchDate).toLocaleDateString(
                          language === 'tr' ? 'tr-TR' : 'en-US',
                          {
                            day: 'numeric',
                            month: 'short',
                          }
                        )}
                      </span>
                      <div className="flex items-center gap-1.5 flex-1 justify-center">
                        <span className="font-medium truncate max-w-[80px] text-right">
                          {m.homeTeam.name.split(' ')[0]}
                        </span>
                        <span className="font-bold tabular-nums px-1.5 py-0.5 rounded bg-muted/30">
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
          </div>
        )}

        {/* ── Standings Comparison ── */}
        {homeStats && awayStats && (
          <div className="neon-card rounded-xl p-4 sm:p-5 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(37, 99, 235, 0.1)' }}
              >
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">
                {t.matchDetail.standingsComparison}
              </h3>
            </div>

            <div className="space-y-3">
              {/* Team Headers */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  {match.homeTeam.logoUrl && (
                    <Image
                      src={match.homeTeam.logoUrl}
                      alt=""
                      width={16}
                      height={16}
                      className="rounded"
                    />
                  )}
                  <span className="text-xs font-medium truncate">
                    {match.homeTeam.code || match.homeTeam.name.split(' ')[0]}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground px-2">
                  {language === 'tr' ? 'Sıra' : 'Pos'}
                </span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className="text-xs font-medium truncate">
                    {match.awayTeam.code || match.awayTeam.name.split(' ')[0]}
                  </span>
                  {match.awayTeam.logoUrl && (
                    <Image
                      src={match.awayTeam.logoUrl}
                      alt=""
                      width={16}
                      height={16}
                      className="rounded"
                    />
                  )}
                </div>
              </div>

              {[
                {
                  label: language === 'tr' ? 'Lig Sırası' : 'League Position',
                  home: homeStats.leaguePosition
                    ? `#${homeStats.leaguePosition}`
                    : '-',
                  away: awayStats.leaguePosition
                    ? `#${awayStats.leaguePosition}`
                    : '-',
                },
                {
                  label: language === 'tr' ? 'Puan' : 'Points',
                  home: homeStats.points,
                  away: awayStats.points,
                },
                {
                  label: language === 'tr' ? 'Galibiyet' : 'Wins',
                  home: homeStats.wins,
                  away: awayStats.wins,
                },
                {
                  label: language === 'tr' ? 'Atılan Gol' : 'Goals For',
                  home: homeStats.goalsFor,
                  away: awayStats.goalsFor,
                },
                {
                  label: language === 'tr' ? 'Yenilen Gol' : 'Goals Against',
                  home: homeStats.goalsAgainst,
                  away: awayStats.goalsAgainst,
                },
                {
                  label: language === 'tr' ? 'Gol Yemeden' : 'Clean Sheets',
                  home: homeStats.cleanSheets,
                  away: awayStats.cleanSheets,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="font-bold tabular-nums flex-1 text-left">
                    {stat.home}
                  </span>
                  <span className="text-[10px] text-muted-foreground px-2 text-center min-w-[80px]">
                    {stat.label}
                  </span>
                  <span className="font-bold tabular-nums flex-1 text-right">
                    {stat.away}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
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
  homeTeam,
  awayTeam,
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
  homeTeam: string
  awayTeam: string
  t: ReturnType<typeof useI18n>['t']
}) {
  const homePercent = Math.round(homeWinProb)
  const drawPercent = Math.round(drawProb)
  const awayPercent = Math.round(awayWinProb)
  const confidenceColor =
    confidence >= 70 ? '#10B981' : confidence >= 50 ? '#FBBF24' : '#EF4444'

  return (
    <div className="space-y-4">
      {/* Predicted Score */}
      <div className="text-center py-3 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10">
        <p className="text-[10px] text-muted-foreground mb-1">
          {t.predictions.predictedScore}
        </p>
        <p
          className="text-2xl font-extrabold tabular-nums"
          style={{ textShadow: '0 0 15px rgba(14, 165, 233, 0.3)' }}
        >
          {predictedScore.home.toFixed(1)} - {predictedScore.away.toFixed(1)}
        </p>
      </div>

      {/* Win Probabilities */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg p-2 bg-green-500/5 border border-green-500/10">
          <p className="text-[10px] text-muted-foreground truncate">
            {homeTeam.split(' ')[0]}
          </p>
          <p className="text-lg font-bold text-green-500">%{homePercent}</p>
        </div>
        <div className="rounded-lg p-2 bg-yellow-500/5 border border-yellow-500/10">
          <p className="text-[10px] text-muted-foreground">
            {t.predictions.draw}
          </p>
          <p className="text-lg font-bold text-yellow-500">%{drawPercent}</p>
        </div>
        <div className="rounded-lg p-2 bg-red-500/5 border border-red-500/10">
          <p className="text-[10px] text-muted-foreground truncate">
            {awayTeam.split(' ')[0]}
          </p>
          <p className="text-lg font-bold text-red-500">%{awayPercent}</p>
        </div>
      </div>

      {/* Probability Bar */}
      <div>
        <div className="flex h-2.5 rounded-full overflow-hidden bg-muted/30">
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
      </div>

      {/* Confidence */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {t.predictions.confidence}
        </span>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded-full bg-muted/30 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${confidence}%`,
                background:
                  confidence >= 70
                    ? 'linear-gradient(90deg, #10B981, #34D399)'
                    : confidence >= 50
                      ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                      : 'linear-gradient(90deg, #EF4444, #F87171)',
              }}
            />
          </div>
          <span
            className="text-xs font-bold"
            style={{ color: confidenceColor }}
          >
            %{Math.round(confidence)}
          </span>
        </div>
      </div>

      {/* Explanation */}
      {explanation && (
        <div className="pt-3 border-t border-border/30">
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">
            {t.predictions.whyThisPrediction}
          </p>
          <p className="text-xs text-muted-foreground/80 leading-relaxed">
            {explanation}
          </p>
          {keyFactors && keyFactors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {keyFactors.map((factor, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground/80 flex items-start gap-1.5"
                >
                  <span className="text-[#0EA5E9] mt-0.5">•</span>
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

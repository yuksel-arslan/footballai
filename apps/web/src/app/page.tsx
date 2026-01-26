'use client'

import { QuickStats } from '@/components/home/quick-stats'
import { MatchList } from '@/components/matches/match-list'
import { LiveScores } from '@/components/matches/live-scores'
import { LeagueTable } from '@/components/standings/league-table'
import { Brain, Sparkles, TrendingUp, Calendar, ArrowRight, User, LogIn } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth/useAuth'

function HeroSection() {
  const { t } = useI18n()

  return (
    <section className="relative py-6 sm:py-10 lg:py-16">
      {/* Neon Background Effects - smaller on mobile */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/4 w-48 sm:w-72 lg:w-96 h-48 sm:h-72 lg:h-96 rounded-full blur-3xl -translate-y-1/2 opacity-20 dark:opacity-40"
          style={{ background: 'linear-gradient(135deg, #2563EB, #0EA5E9)' }}
        />
      </div>

      <div className="relative">
        <div className="max-w-2xl">
          {/* Badge - compact on mobile */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full glass-card mb-4 border border-[#0EA5E9]/20">
            <Brain className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="text-xs sm:text-sm font-medium">{t.home.badge}</span>
            <Sparkles className="w-3.5 h-3.5 text-[#FBBF24]" />
          </div>

          {/* Title - responsive sizing */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-[#2563EB] via-[#0EA5E9] to-[#FBBF24] bg-clip-text text-transparent">
              {t.home.title1}
            </span>
            <br />
            <span>{t.home.title2}</span>
          </h1>

          {/* Description - compact */}
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-muted-foreground">
            {t.home.description}
          </p>

          {/* CTA Buttons - compact and responsive */}
          <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
            <Link
              href="/predictions"
              className="btn-neon inline-flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-sm font-semibold"
            >
              <TrendingUp className="w-4 h-4" />
              {t.home.ctaPredictions}
            </Link>
            <Link
              href="/matches"
              className="inline-flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg border border-[#0EA5E9]/30 bg-card hover:bg-muted/50 text-sm font-semibold transition-all"
            >
              <Calendar className="w-4 h-4" />
              {t.home.ctaMatches}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function SectionHeader({
  title,
  href,
  linkText,
  gradient = 'primary',
}: {
  title: string
  description?: string
  href?: string
  linkText?: string
  gradient?: 'primary' | 'secondary' | 'accent'
}) {
  const gradients = {
    primary: 'from-[#2563EB] to-[#0EA5E9]',
    secondary: 'from-[#0EA5E9] to-[#10B981]',
    accent: 'from-[#FBBF24] to-[#F59E0B]',
  }

  return (
    <div className="flex items-center justify-between mb-3 sm:mb-4">
      <h2 className={`text-base sm:text-lg font-bold bg-gradient-to-r ${gradients[gradient]} bg-clip-text text-transparent`}>
        {title}
      </h2>
      {href && linkText && (
        <Link
          href={href}
          className="text-xs sm:text-sm text-[#0EA5E9] hover:text-[#2563EB] flex items-center gap-0.5 transition-colors"
        >
          {linkText}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  )
}

function AuthButtons() {
  const { user, loading, logout } = useAuth()
  const { t } = useI18n()

  if (loading) {
    return <div className="h-10 w-24 bg-muted/50 rounded-lg animate-pulse" />
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/profile"
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <User className="w-4 h-4" />
          <span className="text-sm font-medium">{user.fullName || user.email}</span>
        </Link>
        <button
          onClick={logout}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t.common?.logout || 'Çıkış'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/10 text-sm font-medium transition-colors"
      >
        <LogIn className="w-4 h-4" />
        {t.common?.login || 'Giriş Yap'}
      </Link>
      <Link
        href="/register"
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
        style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}
      >
        {t.common?.register || 'Kayıt Ol'}
      </Link>
    </div>
  )
}

export default function HomePage() {
  const { t } = useI18n()

  return (
    <div className="min-h-screen">
      {/* Auth Header */}
      <header className="container mx-auto px-3 sm:px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">⚽</span>
            <span className="font-bold bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent">
              FutballAI
            </span>
          </Link>
          <AuthButtons />
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4">
        {/* Hero Section */}
        <HeroSection />

        {/* Quick Stats */}
        <section className="py-4 sm:py-6">
          <QuickStats />
        </section>

        {/* Main Content Grid */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 pb-6 sm:pb-10">
          {/* Left Column - Matches */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Live Scores */}
            <section>
              <LiveScores />
            </section>

            {/* Today's Predictions */}
            <section>
              <SectionHeader
                title={t.home.todayPredictions}
                href="/predictions"
                linkText={t.home.viewAll}
                gradient="primary"
              />
              <MatchList filter="upcoming" limit={4} />
            </section>

            {/* Recent Results */}
            <section>
              <SectionHeader
                title={t.home.recentResults}
                href="/matches"
                linkText={t.home.more}
                gradient="secondary"
              />
              <MatchList filter="finished" limit={3} />
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* League Table */}
            <LeagueTable />

            {/* Featured Prediction Card */}
            <div className="neon-card rounded-xl p-4 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/10 to-[#0EA5E9]/10" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-[#FBBF24]" />
                  <h3 className="text-sm font-semibold">{t.home.featuredPrediction}</h3>
                </div>
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">Man United vs Liverpool</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full w-[45%] rounded-full"
                        style={{ background: 'linear-gradient(90deg, #2563EB, #0EA5E9)' }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[#0EA5E9]">45%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {t.home.confidence}: <span className="text-[#10B981]">87%</span> | {t.home.score}: <span className="text-[#FBBF24]">2-1</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="glass-card rounded-xl p-3 border border-white/5">
              <h3 className="text-sm font-semibold mb-2 bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent">
                {t.home.leagues}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-1">
                {[
                  { label: 'Premier League', href: '/league/PL', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
                  { label: 'La Liga', href: '/league/PD', flag: '🇪🇸' },
                  { label: 'Bundesliga', href: '/league/BL1', flag: '🇩🇪' },
                  { label: 'Serie A', href: '/league/SA', flag: '🇮🇹' },
                  { label: 'Süper Lig', href: '/league/TSL', flag: '🇹🇷' },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-[#0EA5E9]/10 transition-all text-xs"
                  >
                    <span>{link.flag}</span>
                    <span className="truncate">{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Compact */}
      <footer className="border-t border-[#0EA5E9]/10 py-4 sm:py-6">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5">
              <span>⚽</span>
              <span className="font-bold bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent">
                FutballAI
              </span>
            </div>
            <p className="text-muted-foreground">&copy; 2026 FutballAI</p>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">AI-Powered</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

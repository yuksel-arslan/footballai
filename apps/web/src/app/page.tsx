'use client'

import dynamic from 'next/dynamic'
import { QuickStats } from '@/components/home/quick-stats'
import { MatchList } from '@/components/matches/match-list'
import {
  Brain,
  Sparkles,
  TrendingUp,
  Calendar,
  ArrowRight,
  User,
  LogIn,
  Shield,
  Zap,
  BarChart3,
  Bell,
  Trophy,
  ChevronRight,
} from 'lucide-react'

const LiveScores = dynamic(() =>
  import('@/components/matches/live-scores').then((m) => ({
    default: m.LiveScores,
  }))
)
const LeagueTable = dynamic(() =>
  import('@/components/standings/league-table').then((m) => ({
    default: m.LeagueTable,
  }))
)
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth/use-auth'

// ─── Landing Page for unauthenticated users ───

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl bg-background/80">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">⚽</span>
            <span className="text-xl font-bold bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent">
              FootballAI
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#0EA5E9]/30 hover:bg-[#0EA5E9]/10 text-sm font-medium transition-all"
            >
              <LogIn className="w-4 h-4" />
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-white text-sm font-semibold transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
              }}
            >
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div
            className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20"
            style={{ background: 'linear-gradient(135deg, #2563EB, #0EA5E9)' }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] opacity-15"
            style={{ background: 'linear-gradient(135deg, #FBBF24, #F59E0B)' }}
          />
        </div>

        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card mb-6 border border-[#0EA5E9]/20">
              <Brain className="w-4 h-4 text-[#2563EB]" />
              <span className="text-sm font-medium">
                Yapay Zeka Destekli Tahminler
              </span>
              <Sparkles className="w-4 h-4 text-[#FBBF24]" />
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-[#2563EB] via-[#0EA5E9] to-[#FBBF24] bg-clip-text text-transparent">
                Futbolun Geleceğini
              </span>
              <br />
              <span>Tahmin Et</span>
            </h1>

            {/* Description */}
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              AI destekli maç tahminleri, canlı skorlar, detaylı istatistikler
              ve Telegram bildirimleri ile futbolun bir adım önünde ol.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-white text-base font-semibold transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#2563EB]/20"
                style={{
                  background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
                }}
              >
                <Zap className="w-5 h-5" />
                Ücretsiz Hesap Oluştur
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-[#0EA5E9]/30 bg-card hover:bg-muted/50 text-base font-semibold transition-all"
              >
                <LogIn className="w-5 h-5" />
                Giriş Yap
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#10B981]" />
                <span>Güvenli & Ücretsiz</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-[#0EA5E9]" />
                <span>%72+ Doğruluk Oranı</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-[#FBBF24]" />
                <span>Telegram Bildirimleri</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 border-t border-white/5">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">
              Neden{' '}
              <span className="bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent">
                FootballAI
              </span>
              ?
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Gelişmiş yapay zeka modelleri ile futbol tahminlerinde fark yarat.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Brain,
                title: 'AI Tahminler',
                desc: 'XGBoost ve Poisson modelleri ile yüksek doğrulukta maç tahminleri.',
                color: '#2563EB',
              },
              {
                icon: Zap,
                title: 'Canlı Skorlar',
                desc: 'Gerçek zamanlı maç skorları ve anlık güncellemeler.',
                color: '#0EA5E9',
              },
              {
                icon: BarChart3,
                title: 'Detaylı İstatistikler',
                desc: 'Takım formları, H2H kayıtları ve derinlemesine analizler.',
                color: '#10B981',
              },
              {
                icon: Bell,
                title: 'Telegram Bildirimleri',
                desc: "Yeni tahminler anında Telegram'a gönderilir.",
                color: '#FBBF24',
              },
              {
                icon: Trophy,
                title: '5 Büyük Lig',
                desc: 'Premier League, La Liga, Serie A, Bundesliga ve Süper Lig.',
                color: '#F59E0B',
              },
              {
                icon: Shield,
                title: 'Güvenli Hesap',
                desc: 'İki faktörlü kimlik doğrulama ve Google ile giriş desteği.',
                color: '#8B5CF6',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="glass-card rounded-xl p-5 sm:p-6 border border-white/5 hover:border-[#0EA5E9]/20 transition-all group"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: `${feature.color}15` }}
                >
                  <feature.icon
                    className="w-5 h-5"
                    style={{ color: feature.color }}
                  />
                </div>
                <h3 className="font-semibold mb-1.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preview Section */}
      <section className="py-16 sm:py-24 border-t border-white/5">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold">
              Hemen{' '}
              <span className="bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] bg-clip-text text-transparent">
                Keşfet
              </span>
            </h2>
            <p className="mt-3 text-muted-foreground">
              Günün öne çıkan ligleri
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-3xl mx-auto">
            {[
              { label: 'Premier League', href: '/league/PL', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
              { label: 'La Liga', href: '/league/PD', flag: '🇪🇸' },
              { label: 'Bundesliga', href: '/league/BL1', flag: '🇩🇪' },
              { label: 'Serie A', href: '/league/SA', flag: '🇮🇹' },
              { label: 'Süper Lig', href: '/league/TSL', flag: '🇹🇷' },
            ].map((league) => (
              <Link
                key={league.href}
                href={league.href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl glass-card border border-white/5 hover:border-[#0EA5E9]/20 transition-all hover:scale-[1.02]"
              >
                <span className="text-3xl">{league.flag}</span>
                <span className="text-xs sm:text-sm font-medium text-center">
                  {league.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 border-t border-white/5 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: 'linear-gradient(135deg, #2563EB, #0EA5E9, #FBBF24)',
          }}
        />
        <div className="container mx-auto px-4 sm:px-6 relative text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
            Tahminlere hemen başla
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            Ücretsiz hesap oluştur, AI tahminlerini gör ve Telegram bildirimleri
            al.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-white text-base font-semibold transition-all hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
              }}
            >
              Ücretsiz Kayıt Ol
              <ChevronRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-[#0EA5E9]/30 hover:bg-muted/50 text-base font-semibold transition-all"
            >
              Zaten hesabım var
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span>⚽</span>
              <span className="font-bold bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent">
                FootballAI
              </span>
            </div>
            <p className="text-muted-foreground">
              &copy; 2026 FootballAI - AI-Powered Football Predictions
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── Dashboard for authenticated users ───

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
            <span className="text-xs sm:text-sm font-medium">
              {t.home.badge}
            </span>
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
      <h2
        className={`text-base sm:text-lg font-bold bg-gradient-to-r ${gradients[gradient]} bg-clip-text text-transparent`}
      >
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
  const { user, logout } = useAuth()

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/profile"
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <User className="w-4 h-4" />
          <span className="text-sm font-medium">
            {user.fullName || user.email}
          </span>
        </Link>
        <button
          onClick={logout}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Çıkış
        </button>
      </div>
    )
  }

  return null
}

function Dashboard() {
  const { t } = useI18n()

  return (
    <div className="min-h-screen">
      {/* Auth Header */}
      <header className="container mx-auto px-3 sm:px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">⚽</span>
            <span className="font-bold bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent">
              FootballAI
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
                  <h3 className="text-sm font-semibold">
                    {t.home.featuredPrediction}
                  </h3>
                </div>
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">
                    Man United vs Liverpool
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full w-[45%] rounded-full"
                        style={{
                          background:
                            'linear-gradient(90deg, #2563EB, #0EA5E9)',
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[#0EA5E9]">
                      45%
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {t.home.confidence}:{' '}
                    <span className="text-[#10B981]">87%</span> | {t.home.score}
                    : <span className="text-[#FBBF24]">2-1</span>
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
                FootballAI
              </span>
            </div>
            <p className="text-muted-foreground">&copy; 2026 FootballAI</p>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">AI-Powered</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── Main Page: Landing or Dashboard based on auth ───

export default function HomePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Yükleniyor...</span>
        </div>
      </div>
    )
  }

  if (user) {
    return <Dashboard />
  }

  return <LandingPage />
}

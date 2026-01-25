import { Header } from '@/components/layout/header'
import { QuickStats } from '@/components/home/quick-stats'
import { MatchList } from '@/components/matches/match-list'
import { LiveScores } from '@/components/matches/live-scores'
import { LeagueTable } from '@/components/standings/league-table'
import { Brain, Sparkles, TrendingUp, Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'

function HeroSection() {
  return (
    <section className="relative py-12 lg:py-20">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl -translate-y-1/2" />
      </div>

      <div className="relative">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Yapay Zeka Destekli Tahminler</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            <span className="gradient-text">Futbolun Geleceğini</span>
            <br />
            <span>Tahmin Edin</span>
          </h1>

          {/* Description */}
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            Makine öğrenmesi modelleri ile maç sonuçlarını tahmin edin.
            Gerçek zamanlı veriler, detaylı istatistikler ve akıllı analizler.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/predictions"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              <TrendingUp className="w-5 h-5" />
              Tahminlere Bak
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/matches"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border bg-card hover:bg-muted/50 font-semibold transition-colors"
            >
              <Calendar className="w-5 h-5" />
              Maç Programı
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function SectionHeader({
  title,
  description,
  href,
  linkText,
}: {
  title: string
  description?: string
  href?: string
  linkText?: string
}) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {description && (
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
        )}
      </div>
      {href && linkText && (
        <Link
          href={href}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          {linkText}
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4">
        {/* Hero Section */}
        <HeroSection />

        {/* Quick Stats */}
        <section className="py-8">
          <QuickStats />
        </section>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3 pb-12">
          {/* Left Column - Matches */}
          <div className="lg:col-span-2 space-y-8">
            {/* Live Scores */}
            <section>
              <LiveScores />
            </section>

            {/* Today's Predictions */}
            <section>
              <SectionHeader
                title="Bugünün Tahminleri"
                description="AI modelimizin günlük maç tahminleri"
                href="/predictions"
                linkText="Tümünü Gör"
              />
              <MatchList filter="upcoming" limit={6} />
            </section>

            {/* Recent Results */}
            <section>
              <SectionHeader
                title="Son Sonuçlar"
                description="Tamamlanan maçlar ve tahmin başarısı"
                href="/results"
                linkText="Daha Fazla"
              />
              <MatchList filter="finished" limit={3} />
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            {/* League Table */}
            <LeagueTable />

            {/* Featured Prediction Card */}
            <div className="glass-card rounded-2xl p-6 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold">Günün Öne Çıkan Tahmini</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Manchester United vs Liverpool</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-[45%] bg-primary rounded-full" />
                    </div>
                    <span className="text-sm font-bold">%45</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Model güveni: %87 | Beklenen skor: 2-1
                  </p>
                </div>
                <Link
                  href="/match/featured"
                  className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Detaylı Analiz
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Quick Links */}
            <div className="glass-card rounded-2xl p-4">
              <h3 className="font-semibold mb-3">Hızlı Erişim</h3>
              <div className="space-y-2">
                {[
                  { label: 'Premier League', href: '/league/PL' },
                  { label: 'La Liga', href: '/league/PD' },
                  { label: 'Bundesliga', href: '/league/BL1' },
                  { label: 'Serie A', href: '/league/SA' },
                  { label: 'Süper Lig', href: '/league/TSL' },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <span className="text-sm">{link.label}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚽</span>
              <span className="font-bold">Futball AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2026 Futball AI. Tüm hakları saklıdır.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
                Hakkımızda
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
                Gizlilik
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
                Kullanım Şartları
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

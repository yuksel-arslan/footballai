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
      {/* Neon Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/4 w-96 h-96 rounded-full blur-3xl -translate-y-1/2 opacity-30 dark:opacity-50"
          style={{ background: 'linear-gradient(135deg, #2563EB, #0EA5E9)' }}
        />
        <div
          className="absolute top-1/2 right-1/4 w-96 h-96 rounded-full blur-3xl -translate-y-1/2 opacity-20 dark:opacity-40"
          style={{ background: 'linear-gradient(135deg, #FBBF24, #F59E0B)' }}
        />
      </div>

      <div className="relative">
        <div className="max-w-3xl">
          {/* Badge with neon glow */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6 border border-[#0EA5E9]/20 shadow-[0_0_20px_rgba(14,165,233,0.15)]">
            <Brain className="w-4 h-4 text-[#2563EB]" />
            <span className="text-sm font-medium">Yapay Zeka Destekli Tahminler</span>
            <Sparkles className="w-4 h-4 text-[#FBBF24]" />
          </div>

          {/* Title with neon gradient */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
            <span
              className="bg-gradient-to-r from-[#2563EB] via-[#0EA5E9] to-[#FBBF24] bg-clip-text text-transparent"
              style={{ filter: 'drop-shadow(0 0 30px rgba(14, 165, 233, 0.4))' }}
            >
              Futbolun Geleceğini
            </span>
            <br />
            <span>Tahmin Edin</span>
          </h1>

          {/* Description */}
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            Makine öğrenmesi modelleri ile maç sonuçlarını tahmin edin.
            Gerçek zamanlı veriler, detaylı istatistikler ve akıllı analizler.
          </p>

          {/* Neon CTA Buttons */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/predictions"
              className="btn-neon inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold"
            >
              <TrendingUp className="w-5 h-5" />
              Tahminlere Bak
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/matches"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#0EA5E9]/30 bg-card hover:bg-muted/50 font-semibold transition-all hover:border-[#0EA5E9]/50 hover:shadow-[0_0_20px_rgba(14,165,233,0.15)]"
            >
              <Calendar className="w-5 h-5" />
              Maç Programı
            </Link>
          </div>

          {/* Neon underline */}
          <div
            className="h-1 w-32 mt-10 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #2563EB, #0EA5E9, transparent)',
              boxShadow: '0 0 20px rgba(14, 165, 233, 0.5)'
            }}
          />
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
    <div className="flex items-end justify-between mb-6">
      <div>
        <h2
          className={`text-2xl font-bold bg-gradient-to-r ${gradients[gradient]} bg-clip-text text-transparent`}
          style={{ filter: 'drop-shadow(0 0 15px rgba(14, 165, 233, 0.3))' }}
        >
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
        )}
        <div
          className={`h-0.5 w-16 mt-2 rounded-full bg-gradient-to-r ${gradients[gradient]}`}
          style={{ boxShadow: '0 0 10px rgba(37, 99, 235, 0.4)' }}
        />
      </div>
      {href && linkText && (
        <Link
          href={href}
          className="text-sm text-[#0EA5E9] hover:text-[#2563EB] flex items-center gap-1 transition-colors"
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
                gradient="primary"
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
                gradient="secondary"
              />
              <MatchList filter="finished" limit={3} />
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            {/* League Table */}
            <LeagueTable />

            {/* Featured Prediction Card with Neon */}
            <div className="neon-card rounded-2xl p-6 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/10 to-[#0EA5E9]/10" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-[#FBBF24]" />
                  <h3 className="font-semibold">Günün Öne Çıkan Tahmini</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Manchester United vs Liverpool</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full w-[45%] rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, #2563EB, #0EA5E9)',
                          boxShadow: '0 0 10px rgba(14, 165, 233, 0.5)'
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-[#0EA5E9]">%45</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Model güveni: <span className="text-[#10B981]">%87</span> | Beklenen skor: <span className="text-[#FBBF24]">2-1</span>
                  </p>
                </div>
                <Link
                  href="/match/featured"
                  className="mt-4 inline-flex items-center gap-1 text-sm text-[#0EA5E9] hover:text-[#2563EB] transition-colors"
                >
                  Detaylı Analiz
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Quick Links with Neon hover */}
            <div className="glass-card rounded-2xl p-4 border border-white/5">
              <h3 className="font-semibold mb-3 bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent">
                Hızlı Erişim
              </h3>
              <div className="space-y-2">
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
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-[#0EA5E9]/10 transition-all group border border-transparent hover:border-[#0EA5E9]/20"
                  >
                    <div className="flex items-center gap-2">
                      <span>{link.flag}</span>
                      <span className="text-sm">{link.label}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-[#0EA5E9] transition-all" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer with neon accent */}
      <footer className="border-t border-[#0EA5E9]/10 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚽</span>
              <span
                className="font-bold bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent"
              >
                FutballAI
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2026 FutballAI. Tüm hakları saklıdır.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-[#0EA5E9] transition-colors">
                Hakkımızda
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-[#0EA5E9] transition-colors">
                Gizlilik
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-[#0EA5E9] transition-colors">
                Kullanım Şartları
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

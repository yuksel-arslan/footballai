'use client'

import Link from 'next/link'
import { Coins, Zap, Check } from 'lucide-react'
import { useCredits } from '@/hooks/use-credits'
import { useAuth } from '@/lib/auth/use-auth'
import { useI18n } from '@/lib/i18n'
import { FREE_MODE } from '@/lib/free-mode'

interface CreditPackage {
  id: 'starter' | 'standard' | 'pro'
  priceUsd: number
  credits: number
  popular?: boolean
  description: { tr: string; en: string }
}

const PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    priceUsd: 10,
    credits: 20,
    description: {
      tr: 'Platformu denemek için — 5 tahmin veya değer analizi.',
      en: 'Try the platform — 5 predictions or value analyses.',
    },
  },
  {
    id: 'standard',
    priceUsd: 50,
    credits: 110,
    popular: true,
    description: {
      tr: 'Düzenli kullanım için — %10 bonus kredi.',
      en: 'Regular use — 10% bonus credits.',
    },
  },
  {
    id: 'pro',
    priceUsd: 100,
    credits: 250,
    description: {
      tr: 'Yoğun kullanım — %25 bonus kredi, en iyi fiyat.',
      en: 'Power users — 25% bonus credits, best value.',
    },
  },
]

const WHOP_URLS: Record<CreditPackage['id'], string | undefined> = {
  starter: process.env.NEXT_PUBLIC_WHOP_PACKAGE_STARTER,
  standard: process.env.NEXT_PUBLIC_WHOP_PACKAGE_STANDARD,
  pro: process.env.NEXT_PUBLIC_WHOP_PACKAGE_PRO,
}

export default function PricingPage() {
  const { isAuthenticated, user } = useAuth()
  const { data: credits } = useCredits()
  const { language } = useI18n()
  const tr = language === 'tr'

  // Free mode: no credits to sell — show a simple notice instead of packages.
  if (FREE_MODE) {
    return (
      <div className="min-h-screen pt-20 pb-16">
        <main className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            {tr ? 'Artık ücretsiz 🎉' : 'Now free 🎉'}
          </h1>
          <p className="text-muted-foreground mb-6">
            {tr
              ? 'FootballAI şu an tamamen ücretsiz. Tüm maç öncesi, maç arası ve maç sonu analiz ve tahminleri kredisiz, sınırsız kullanabilirsin.'
              : 'FootballAI is currently free. All pre-match, in-play and post-match analyses and predictions — no credits, no limits.'}
          </p>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
          >
            {tr ? 'Raporlara git →' : 'Go to reports →'}
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 pb-16">
      <main className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            {tr ? 'Kredi Paketleri' : 'Credit Packages'}
          </h1>
          <p className="text-muted-foreground">
            {tr
              ? 'Krediler tahmin ve analizlerde kullanılır. Her AI tahmini ve değer analizi 4 kredidir.'
              : 'Credits power predictions and analyses. Every AI prediction and value analysis costs 4 credits.'}
          </p>
          {isAuthenticated && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="text-sm">
                {tr ? 'Mevcut bakiyeniz' : 'Current balance'}:{' '}
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {credits ?? 0} cr
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Pricing reference */}
        <div className="neon-card rounded-2xl p-5 mb-8 max-w-2xl mx-auto">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#22D3EE]" />
            {tr ? 'Kredi nerede harcanır?' : 'What do credits buy?'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="px-3 py-2 rounded-lg bg-muted/30">
              <div className="font-medium">
                {tr ? 'AI Tahmini' : 'AI Prediction'}
              </div>
              <div className="text-muted-foreground mt-0.5">
                {tr
                  ? 'Kazanma olasılıkları, skor ve analiz'
                  : 'Win probabilities, score and analysis'}
              </div>
              <div className="text-amber-500 mt-1 font-medium">4 cr</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-muted/30">
              <div className="font-medium">
                {tr ? 'Değer Analizi' : 'Value Analysis'}
              </div>
              <div className="text-muted-foreground mt-0.5">
                {tr
                  ? 'Dixon-Coles + piyasa oranına karşı avantaj'
                  : 'Dixon-Coles + edge vs market odds'}
              </div>
              <div className="text-amber-500 mt-1 font-medium">4 cr</div>
            </div>
          </div>
          <div className="mt-3 px-3 py-2 rounded-lg bg-muted/20 text-xs text-muted-foreground">
            {tr
              ? 'Aynı maçı tekrar açmak ücretsizdir — her maç için yalnızca bir kez ödersiniz.'
              : 'Re-opening the same match is free — you pay once per match.'}
          </div>
        </div>

        {/* Packages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PACKAGES.map((pkg) => {
            const whopUrl = WHOP_URLS[pkg.id]
            const perCredit = pkg.priceUsd / pkg.credits
            return (
              <div
                key={pkg.id}
                className={`neon-card rounded-2xl p-6 relative ${
                  pkg.popular ? 'ring-2 ring-amber-500/50' : ''
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gradient-to-r from-amber-500 to-yellow-500 text-black">
                    {tr ? 'Popüler' : 'Popular'}
                  </span>
                )}
                <h2 className="font-bold text-lg capitalize mb-1">{pkg.id}</h2>
                <p className="text-xs text-muted-foreground mb-4 min-h-[2.5em]">
                  {pkg.description[tr ? 'tr' : 'en']}
                </p>
                <div className="mb-1">
                  <span className="text-3xl font-bold">${pkg.priceUsd}</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span className="text-xl font-semibold text-amber-600 dark:text-amber-400">
                    {pkg.credits}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tr ? 'kredi' : 'credits'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-5">
                  ${perCredit.toFixed(2)} / {tr ? 'kredi' : 'credit'}
                </p>

                {!isAuthenticated ? (
                  <Link
                    href={`/login?redirect=${encodeURIComponent('/pricing')}`}
                    className="block w-full text-center px-4 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-[#00E07A] to-[#22D3EE] text-white hover:opacity-90 transition-opacity"
                  >
                    {tr ? 'Önce giriş yap' : 'Login to purchase'}
                  </Link>
                ) : whopUrl ? (
                  <a
                    href={`${whopUrl}${whopUrl.includes('?') ? '&' : '?'}metadata[userId]=${encodeURIComponent(
                      user?.id ?? ''
                    )}&metadata[email]=${encodeURIComponent(user?.email ?? '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-4 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:opacity-90 transition-opacity"
                  >
                    {tr ? 'Whop ile satın al' : 'Buy via Whop'}
                  </a>
                ) : (
                  <button
                    disabled
                    className="block w-full text-center px-4 py-2.5 rounded-xl font-medium text-sm bg-muted/30 text-muted-foreground cursor-not-allowed"
                    title="NEXT_PUBLIC_WHOP_PACKAGE_* env vars not configured"
                  >
                    {tr ? 'Yakında' : 'Coming soon'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-8 text-xs text-muted-foreground text-center max-w-xl mx-auto">
          <Check className="w-3 h-3 inline-block mr-1 text-green-500" />
          {tr
            ? 'Krediler hesabınıza Whop ödemesi onaylandıktan sonra otomatik eklenir. Sorularınız için '
            : 'Credits are added to your account once the Whop payment is confirmed. For any questions '}
          <a
            href="mailto:contact@yukselarslan.com"
            className="underline hover:text-foreground"
          >
            contact@yukselarslan.com
          </a>
          .
        </div>
      </main>
    </div>
  )
}

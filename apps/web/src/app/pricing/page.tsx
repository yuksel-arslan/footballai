'use client'

import Link from 'next/link'
import { Coins, Zap, Check } from 'lucide-react'
import { useCredits } from '@/hooks/use-credits'
import { useAuth } from '@/lib/auth/use-auth'
import { useI18n } from '@/lib/i18n'

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
    priceUsd: 50,
    credits: 100,
    description: {
      tr: 'Platformu denemek için — birkaç farklı modelde tahmin yapın.',
      en: 'Try the platform — a few predictions across model tiers.',
    },
  },
  {
    id: 'standard',
    priceUsd: 100,
    credits: 210,
    popular: true,
    description: {
      tr: 'Düzenli kullanım için — modeller arasında esneklik.',
      en: 'Casual use — flexibility across all model tiers.',
    },
  },
  {
    id: 'pro',
    priceUsd: 270,
    credits: 650,
    description: {
      tr: 'Yoğun kullanım — Pro modeli sınırsız sayılabilir kullanım.',
      en: 'Power users — near-unlimited Pro-tier predictions.',
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

  return (
    <div className="min-h-screen pt-20 pb-16">
      <main className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            {tr ? 'Kredi Paketleri' : 'Credit Packages'}
          </h1>
          <p className="text-muted-foreground">
            {tr
              ? 'Tahminlerde kullanılan krediler. Modelin gücüne göre tahmin başına 1–9 kredi.'
              : 'Credits power your predictions. Each prediction costs 1–9 credits depending on the model.'}
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
            <Zap className="w-4 h-4 text-[#0EA5E9]" />
            {tr ? 'Tahmin başına maliyet' : 'Cost per prediction'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="px-3 py-2 rounded-lg bg-muted/30">
              <div className="font-medium">Gemini 2.0 Flash Lite</div>
              <div className="text-amber-500 mt-1">1 cr</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-muted/30">
              <div className="font-medium">Gemini 2.0 Flash</div>
              <div className="text-amber-500 mt-1">2 cr</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-muted/30">
              <div className="font-medium">Gemini 2.5 Flash</div>
              <div className="text-amber-500 mt-1">3 cr</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-muted/30">
              <div className="font-medium">Gemini 2.5 Pro</div>
              <div className="text-amber-500 mt-1">9 cr</div>
            </div>
          </div>
          <div className="mt-3 px-3 py-2 rounded-lg bg-muted/20 text-xs text-muted-foreground">
            {tr
              ? 'ML tahmini (Poisson + XGBoost)'
              : 'ML prediction (Poisson + XGBoost)'}
            : <span className="text-amber-500 font-medium">2 cr</span>
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
                    href={`/login?returnTo=${encodeURIComponent('/pricing')}`}
                    className="block w-full text-center px-4 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] text-white hover:opacity-90 transition-opacity"
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

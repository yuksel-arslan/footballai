import type { Metadata, Viewport } from 'next'
import { Inter, Baloo_2 } from 'next/font/google'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import './footballai-theme.css'
import './footballai-app.css'

// Stadium Night typography: Inter for UI, Baloo 2 for display/headings.
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
})
const baloo = Baloo_2({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-baloo',
  display: 'swap',
})
import { Providers } from './providers'
import { LayoutWrapper } from '@/components/layout/layout-wrapper'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import { OfflineBanner } from '@/components/pwa/offline-banner'

const SITE_URL = 'https://footballai.io'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: '%s | FootballAI',
    default: 'FootballAI - AI-Powered Football Predictions',
  },
  description:
    'AI-powered football match predictions, live scores, standings and detailed analysis. Premier League, La Liga, Bundesliga, Serie A and more.',
  keywords: [
    'football predictions',
    'match predictions',
    'ai football',
    'artificial intelligence predictions',
    'live scores',
    'standings',
    'premier league',
    'la liga',
    'bundesliga',
    'serie a',
    'football analysis',
    'match results',
  ],
  authors: [{ name: 'FootballAI', url: SITE_URL }],
  creator: 'FootballAI',
  publisher: 'FootballAI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    title: 'FootballAI - AI-Powered Football Predictions',
    description:
      'AI-powered football match predictions, live scores and detailed analysis.',
    siteName: 'FootballAI',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'FootballAI - AI-Powered Football Predictions',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FootballAI - AI-Powered Football Predictions',
    description:
      'AI-powered football match predictions, live scores and detailed analysis.',
    images: [`${SITE_URL}/og-image.png`],
    creator: '@footballai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Google Search Console verification (eklenecek)
    // google: 'verification-code',
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      'en-US': SITE_URL,
      'tr-TR': `${SITE_URL}?lang=tr`,
      'de-DE': `${SITE_URL}?lang=de`,
      'es-ES': `${SITE_URL}?lang=es`,
      'it-IT': `${SITE_URL}?lang=it`,
      'fr-FR': `${SITE_URL}?lang=fr`,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://crests.football-data.org" />
        <link rel="dns-prefetch" href="https://crests.football-data.org" />
        {/* PWA Meta Tags */}
        <meta name="application-name" content="FootballAI" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="FootballAI" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#00E07A" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body
        className={`${inter.variable} ${baloo.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        <Providers>
          <ServiceWorkerRegister />
          <OfflineBanner />
          <div className="flex min-h-screen">
            <LayoutWrapper>{children}</LayoutWrapper>
          </div>
        </Providers>
      </body>
    </html>
  )
}

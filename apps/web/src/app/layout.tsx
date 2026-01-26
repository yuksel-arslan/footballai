import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Providers } from './providers'
import { Sidebar } from '@/components/layout/sidebar'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'

const SITE_URL = 'https://futballai.com'

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
    template: '%s | FutballAI',
    default: 'FutballAI - AI Destekli Futbol Tahminleri',
  },
  description:
    'Yapay zeka teknolojisi ile futbol maç tahminleri, canlı skorlar, puan durumu ve detaylı analizler. Premier League, La Liga, Bundesliga, Serie A ve Süper Lig.',
  keywords: [
    'futbol tahmin',
    'maç tahmini',
    'ai futbol',
    'yapay zeka tahmin',
    'canlı skor',
    'puan durumu',
    'premier league',
    'süper lig',
    'la liga',
    'futbol analiz',
    'maç sonuçları',
  ],
  authors: [{ name: 'FutballAI', url: SITE_URL }],
  creator: 'FutballAI',
  publisher: 'FutballAI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: SITE_URL,
    title: 'FutballAI - AI Destekli Futbol Tahminleri',
    description: 'Yapay zeka ile futbol maç tahminleri, canlı skorlar ve detaylı analizler.',
    siteName: 'FutballAI',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'FutballAI - AI Destekli Futbol Tahminleri',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FutballAI - AI Destekli Futbol Tahminleri',
    description: 'Yapay zeka ile futbol maç tahminleri, canlı skorlar ve detaylı analizler.',
    images: [`${SITE_URL}/og-image.png`],
    creator: '@futballai',
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
      'tr-TR': SITE_URL,
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
        <meta name="application-name" content="FutballAI" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FutballAI" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#2563EB" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        <Providers>
          <ServiceWorkerRegister />
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 min-w-0">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}

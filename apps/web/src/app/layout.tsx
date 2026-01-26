import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Providers } from './providers'
import { LayoutWrapper } from '@/components/layout/layout-wrapper'
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
    default: 'FutballAI - AI-Powered Football Predictions',
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
    locale: 'en_US',
    url: SITE_URL,
    title: 'FutballAI - AI-Powered Football Predictions',
    description: 'AI-powered football match predictions, live scores and detailed analysis.',
    siteName: 'FutballAI',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'FutballAI - AI-Powered Football Predictions',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FutballAI - AI-Powered Football Predictions',
    description: 'AI-powered football match predictions, live scores and detailed analysis.',
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
    <html lang="en" suppressHydrationWarning>
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
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </div>
        </Providers>
      </body>
    </html>
  )
}

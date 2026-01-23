import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: {
    template: '%s | FootballAI',
    default: 'FootballAI - AI Destekli Futbol Tahminleri',
  },
  description:
    'Yapay zeka teknolojisi ile futbol maç tahminleri, istatistikler ve analizler.',
  keywords: [
    'futbol tahmin',
    'ai tahmin',
    'maç tahmini',
    'futbol analiz',
    'yapay zeka',
  ],
  authors: [{ name: 'FootballAI' }],
  creator: 'FootballAI',
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: 'https://footballai.com',
    title: 'FootballAI - AI Destekli Futbol Tahminleri',
    description: 'Yapay zeka ile futbol maç tahminleri',
    siteName: 'FootballAI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FootballAI - AI Destekli Futbol Tahminleri',
    description: 'Yapay zeka ile futbol maç tahminleri',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

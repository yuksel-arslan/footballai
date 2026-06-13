import type { Metadata } from 'next'

const SITE_URL = 'https://footballai.io'

export const metadata: Metadata = {
  title: 'Raporlar — Maç Öncesi ve Maç Sonu Analizleri',
  description:
    'Her maç için yapay zekâ destekli maç öncesi tahmin, maç arası okuma ve maç sonu değerlendirme raporları. Kazanma olasılıkları, form, istatistik ve aralarındaki maçlar.',
  keywords: [
    'maç raporu',
    'maç öncesi analiz',
    'maç tahmini',
    'yapay zeka futbol tahmini',
    'maç sonu analiz',
    'futbol istatistik',
  ],
  alternates: { canonical: `${SITE_URL}/reports` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/reports`,
    siteName: 'FootballAI',
    title: 'Maç Raporları | FootballAI',
    description:
      'Maç öncesi, maç arası ve maç sonu analiz raporları — yapay zekâ destekli.',
  },
  twitter: {
    card: 'summary',
    title: 'Maç Raporları | FootballAI',
    description: 'Maç öncesi, maç arası ve maç sonu analiz raporları.',
  },
}

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

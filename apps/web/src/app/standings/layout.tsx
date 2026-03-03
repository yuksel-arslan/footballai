import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Standings',
  description:
    'League tables, form charts and team statistics across all major leagues.',
  openGraph: {
    title: 'Standings | FootballAI',
    description:
      'League tables, form charts and team statistics across all major leagues.',
  },
}

export default function StandingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

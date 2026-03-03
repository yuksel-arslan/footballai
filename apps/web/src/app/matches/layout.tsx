import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Matches',
  description:
    'Live match scores, upcoming fixtures and completed results. Follow all major leagues.',
  openGraph: {
    title: 'Matches | FootballAI',
    description:
      'Live match scores, upcoming fixtures and completed results. Follow all major leagues.',
  },
}

export default function MatchesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

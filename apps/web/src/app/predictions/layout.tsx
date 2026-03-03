import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Predictions',
  description:
    'AI-powered match predictions with confidence ratings and detailed analysis.',
  openGraph: {
    title: 'AI Predictions | FootballAI',
    description:
      'AI-powered match predictions with confidence ratings and detailed analysis.',
  },
}

export default function PredictionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

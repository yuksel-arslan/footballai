import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Favorites',
  description:
    'Follow your favorite teams and leagues with personalized notifications.',
  openGraph: {
    title: 'Favorites | FootballAI',
    description:
      'Follow your favorite teams and leagues with personalized notifications.',
  },
}

export default function FavoritesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

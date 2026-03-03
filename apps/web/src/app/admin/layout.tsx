import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Panel',
  description: 'AI model settings and system administration.',
  openGraph: {
    title: 'Admin Panel | FootballAI',
    description: 'AI model settings and system administration.',
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

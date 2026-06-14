import type { Metadata } from 'next'
import { JournalView } from '@/components/journal/journal-view'

export const metadata: Metadata = { title: 'Tahmin Defterim' }

export default function JournalPage() {
  return <JournalView />
}

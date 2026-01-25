'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { MatchList } from '@/components/matches/match-list'
import { PageHeader } from '@/components/ui/gradient-title'
import { Calendar, Filter, Clock, CheckCircle } from 'lucide-react'

type FilterType = 'all' | 'live' | 'upcoming' | 'finished'

const filters: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Tümü', icon: <Calendar className="w-4 h-4" /> },
  { value: 'live', label: 'Canlı', icon: <div className="w-2 h-2 rounded-full bg-[#EF4444] live-pulse" /> },
  { value: 'upcoming', label: 'Yaklaşan', icon: <Clock className="w-4 h-4" /> },
  { value: 'finished', label: 'Tamamlanan', icon: <CheckCircle className="w-4 h-4" /> },
]

export default function MatchesPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 pb-12">
        <PageHeader
          title="Maçlar"
          description="Tüm liglerdeki maçları takip edin, canlı skorları görün ve tahminleri inceleyin."
          gradient="primary"
          badge={{
            icon: <Calendar className="w-4 h-4 text-[#2563EB]" />,
            text: 'Maç Programı',
          }}
          neonGlow
        />

        {/* Neon Filters */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-thin">
          <div className="flex items-center gap-2 mr-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtrele:</span>
          </div>
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeFilter === filter.value
                  ? 'text-white shadow-neon-blue'
                  : 'bg-muted/50 hover:bg-muted hover:border-[#0EA5E9]/30 border border-transparent'
              }`}
              style={activeFilter === filter.value ? {
                background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
              } : {}}
            >
              {filter.icon}
              {filter.label}
            </button>
          ))}
        </div>

        {/* Match List */}
        <MatchList filter={activeFilter} />
      </main>
    </div>
  )
}

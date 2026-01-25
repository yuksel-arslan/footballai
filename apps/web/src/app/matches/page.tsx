'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { MatchList } from '@/components/matches/match-list'
import { Calendar, Clock, CheckCircle } from 'lucide-react'

type FilterType = 'all' | 'live' | 'upcoming' | 'finished'

const filters: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Tümü', icon: <Calendar className="w-3.5 h-3.5" /> },
  { value: 'live', label: 'Canlı', icon: <div className="w-2 h-2 rounded-full bg-[#EF4444] live-pulse" /> },
  { value: 'upcoming', label: 'Yaklaşan', icon: <Clock className="w-3.5 h-3.5" /> },
  { value: 'finished', label: 'Biten', icon: <CheckCircle className="w-3.5 h-3.5" /> },
]

export default function MatchesPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-3 sm:px-4 pb-6">
        {/* Compact Header */}
        <div className="py-4 sm:py-6">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-5 h-5 text-[#2563EB]" />
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent">
              Maçlar
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">Canlı skorlar ve maç programı</p>
        </div>

        {/* Compact Filters */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-4 overflow-x-auto pb-1 scrollbar-thin">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                activeFilter === filter.value
                  ? 'text-white'
                  : 'bg-muted/50 hover:bg-muted border border-transparent hover:border-[#0EA5E9]/30'
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

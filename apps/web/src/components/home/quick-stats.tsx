'use client'

import { TrendingUp, Target, Activity, Trophy, Zap } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  icon: React.ElementType
  trend?: string
  trendUp?: boolean
  pulse?: boolean
  gradient?: string
}

function StatCard({ label, value, icon: Icon, trend, trendUp, pulse, gradient }: StatCardProps) {
  return (
    <div className="group relative min-w-[180px] flex-1">
      <div className="glass-card rounded-2xl p-4 card-hover overflow-hidden">
        {/* Background Gradient */}
        {gradient && (
          <div
            className={`absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity ${gradient}`}
          />
        )}

        <div className="relative flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl font-bold">
              {value}
            </p>
            {trend && (
              <div className={`flex items-center gap-1 text-xs font-medium ${
                trendUp ? 'text-green-500' : 'text-muted-foreground'
              }`}>
                {trendUp && <TrendingUp className="w-3 h-3" />}
                <span>{trend}</span>
              </div>
            )}
          </div>

          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ${
              pulse ? 'animate-pulse' : ''
            }`}
          >
            <Icon className={`h-6 w-6 text-primary ${pulse ? 'live-pulse' : ''}`} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function QuickStats() {
  const stats: StatCardProps[] = [
    {
      label: 'Model Doğruluğu',
      value: '72.5%',
      icon: Target,
      trend: '+2.3% bu hafta',
      trendUp: true,
      gradient: 'bg-gradient-to-br from-green-500 to-emerald-600',
    },
    {
      label: 'Toplam Tahmin',
      value: '1,247',
      icon: Activity,
      trend: '+156 yeni',
      trendUp: true,
      gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    },
    {
      label: 'Canlı Maçlar',
      value: '3',
      icon: Zap,
      pulse: true,
      gradient: 'bg-gradient-to-br from-red-500 to-orange-600',
    },
    {
      label: 'En İyi Lig',
      value: 'Premier League',
      icon: Trophy,
      gradient: 'bg-gradient-to-br from-amber-500 to-yellow-600',
    },
  ]

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  )
}

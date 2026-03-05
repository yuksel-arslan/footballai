'use client'

import { TrendingUp, Target, Activity, Trophy, Zap } from 'lucide-react'
import { useAIAccuracyStats } from '@/hooks/use-user-predictions'
import { useLiveFixtures } from '@/hooks/use-fixtures'

interface StatCardProps {
  label: string
  value: string
  icon: React.ElementType
  trend?: string
  trendUp?: boolean
  pulse?: boolean
  gradient?: string
  loading?: boolean
}

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  pulse,
  gradient,
  loading,
}: StatCardProps) {
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
            {loading ? (
              <div className="h-8 w-16 rounded shimmer" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
            {trend && !loading && (
              <div
                className={`flex items-center gap-1 text-xs font-medium ${
                  trendUp ? 'text-green-500' : 'text-muted-foreground'
                }`}
              >
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
            <Icon
              className={`h-6 w-6 text-primary ${pulse ? 'live-pulse' : ''}`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function QuickStats() {
  const { data: aiStats, isLoading: aiLoading } = useAIAccuracyStats()
  const { data: liveFixtures, isLoading: liveLoading } = useLiveFixtures()

  const liveCount = liveFixtures?.length ?? 0
  const accuracy = aiStats?.accuracy ?? 0
  const totalPredictions = aiStats?.totalPredictions ?? 0

  const stats: StatCardProps[] = [
    {
      label: 'Model Doğruluğu',
      value: totalPredictions > 0 ? `${accuracy}%` : '-',
      icon: Target,
      trend:
        totalPredictions > 0
          ? `${aiStats?.correctPredictions ?? 0}/${totalPredictions} doğru`
          : undefined,
      trendUp: accuracy > 50,
      gradient: 'bg-gradient-to-br from-green-500 to-emerald-600',
      loading: aiLoading,
    },
    {
      label: 'Toplam Tahmin',
      value:
        totalPredictions > 0 ? totalPredictions.toLocaleString('tr-TR') : '0',
      icon: Activity,
      trend: aiStats?.scoreCorrectPredictions
        ? `${aiStats.scoreCorrectPredictions} skor tahmini doğru`
        : undefined,
      trendUp: (aiStats?.scoreCorrectPredictions ?? 0) > 0,
      gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      loading: aiLoading,
    },
    {
      label: 'Canlı Maçlar',
      value: String(liveCount),
      icon: Zap,
      pulse: liveCount > 0,
      gradient: 'bg-gradient-to-br from-red-500 to-orange-600',
      loading: liveLoading,
    },
    {
      label: 'Skor Doğruluğu',
      value:
        totalPredictions > 0
          ? `${Math.round(((aiStats?.scoreCorrectPredictions ?? 0) / totalPredictions) * 100)}%`
          : '-',
      icon: Trophy,
      trend:
        totalPredictions > 0
          ? `${aiStats?.scoreCorrectPredictions ?? 0}/${totalPredictions} skor doğru`
          : undefined,
      trendUp: (aiStats?.scoreCorrectPredictions ?? 0) > 0,
      gradient: 'bg-gradient-to-br from-amber-500 to-yellow-600',
      loading: aiLoading,
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

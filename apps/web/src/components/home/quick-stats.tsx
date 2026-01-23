'use client'

import { TrendingUp, Target, Activity, Trophy } from 'lucide-react'

const stats = [
  {
    label: 'Model Accuracy',
    value: '72.5%',
    icon: Target,
    trend: '+2.3%',
  },
  {
    label: 'Total Predictions',
    value: '1,247',
    icon: Activity,
    trend: '+156',
  },
  {
    label: 'Live Matches',
    value: '3',
    icon: TrendingUp,
    pulse: true,
  },
  {
    label: 'Top League',
    value: 'Premier League',
    icon: Trophy,
  },
]

export function QuickStats() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex min-w-[160px] items-center gap-3 rounded-lg border border-border bg-card p-4"
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ${
              stat.pulse ? 'animate-pulse-slow' : ''
            }`}
          >
            <stat.icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            {stat.trend && (
              <span className="text-xs text-secondary">{stat.trend}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

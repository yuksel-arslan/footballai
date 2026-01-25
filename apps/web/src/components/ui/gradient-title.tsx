'use client'

interface GradientTitleProps {
  children: React.ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4'
  className?: string
  gradient?: 'primary' | 'secondary' | 'accent' | 'win' | 'neon'
  neonGlow?: boolean
}

const gradients = {
  primary: 'from-[#2563EB] to-[#0EA5E9]',
  secondary: 'from-[#0EA5E9] to-[#10B981]',
  accent: 'from-[#FBBF24] to-[#F59E0B]',
  win: 'from-[#10B981] to-[#34D399]',
  neon: 'from-[#2563EB] via-[#0EA5E9] to-[#FBBF24]',
}

const sizes = {
  h1: 'text-4xl md:text-5xl lg:text-6xl',
  h2: 'text-3xl md:text-4xl',
  h3: 'text-2xl md:text-3xl',
  h4: 'text-xl md:text-2xl',
}

export function GradientTitle({
  children,
  as = 'h1',
  className = '',
  gradient = 'primary',
  neonGlow = false,
}: GradientTitleProps) {
  const Tag = as

  return (
    <Tag
      className={`font-bold tracking-tight bg-gradient-to-r ${gradients[gradient]} bg-clip-text text-transparent ${sizes[as]} ${neonGlow ? 'drop-shadow-[0_0_25px_rgba(14,165,233,0.5)]' : ''} ${className}`}
    >
      {children}
    </Tag>
  )
}

// Section title with gradient underline and neon effects
interface SectionTitleProps {
  children: React.ReactNode
  description?: string
  gradient?: 'primary' | 'secondary' | 'accent' | 'win'
  neonGlow?: boolean
}

export function SectionTitle({ children, description, gradient = 'primary', neonGlow = true }: SectionTitleProps) {
  return (
    <div className="mb-8">
      <h2 className={`text-2xl md:text-3xl font-bold bg-gradient-to-r ${gradients[gradient]} bg-clip-text text-transparent ${neonGlow ? 'drop-shadow-[0_0_20px_rgba(14,165,233,0.4)]' : ''}`}>
        {children}
      </h2>
      {description && (
        <p className="text-muted-foreground mt-2">{description}</p>
      )}
      <div
        className={`h-1 w-20 mt-3 rounded-full bg-gradient-to-r ${gradients[gradient]} ${neonGlow ? 'shadow-[0_0_15px_rgba(37,99,235,0.5)]' : ''}`}
      />
    </div>
  )
}

// Page header with gradient title and neon background effects
interface PageHeaderProps {
  title: string
  description?: string
  gradient?: 'primary' | 'secondary' | 'accent' | 'neon'
  badge?: {
    icon?: React.ReactNode
    text: string
  }
  neonGlow?: boolean
}

export function PageHeader({ title, description, gradient = 'primary', badge, neonGlow = true }: PageHeaderProps) {
  return (
    <div className="relative py-12 lg:py-16">
      {/* Neon background glow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/2 left-1/4 w-72 h-72 rounded-full blur-3xl -translate-y-1/2 opacity-30 dark:opacity-40"
          style={{ background: 'linear-gradient(135deg, #2563EB, #0EA5E9)' }}
        />
        {neonGlow && (
          <div
            className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-20 dark:opacity-30"
            style={{ background: 'linear-gradient(135deg, #FBBF24, #F59E0B)' }}
          />
        )}
      </div>

      <div className="relative">
        {badge && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6 border border-[#0EA5E9]/20 shadow-[0_0_20px_rgba(14,165,233,0.15)]">
            {badge.icon}
            <span className="text-sm font-medium text-[#0EA5E9]">{badge.text}</span>
          </div>
        )}

        <h1
          className={`text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r ${gradients[gradient]} bg-clip-text text-transparent ${neonGlow ? 'drop-shadow-[0_0_30px_rgba(14,165,233,0.5)]' : ''}`}
        >
          {title}
        </h1>

        {description && (
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
            {description}
          </p>
        )}

        {/* Neon underline */}
        {neonGlow && (
          <div
            className="h-1 w-32 mt-6 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #2563EB, #0EA5E9, transparent)',
              boxShadow: '0 0 20px rgba(14, 165, 233, 0.5)'
            }}
          />
        )}
      </div>
    </div>
  )
}

// Neon stat display
interface NeonStatProps {
  value: string | number
  label: string
  color?: 'blue' | 'cyan' | 'gold' | 'green' | 'red'
}

const statColors = {
  blue: { text: '#2563EB', glow: 'rgba(37, 99, 235, 0.5)' },
  cyan: { text: '#0EA5E9', glow: 'rgba(14, 165, 233, 0.5)' },
  gold: { text: '#FBBF24', glow: 'rgba(251, 191, 36, 0.5)' },
  green: { text: '#10B981', glow: 'rgba(16, 185, 129, 0.5)' },
  red: { text: '#EF4444', glow: 'rgba(239, 68, 68, 0.5)' },
}

export function NeonStat({ value, label, color = 'cyan' }: NeonStatProps) {
  const { text, glow } = statColors[color]

  return (
    <div className="stat-card-neon">
      <div
        className="text-3xl md:text-4xl font-black"
        style={{ color: text, textShadow: `0 0 30px ${glow}` }}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
        {label}
      </div>
    </div>
  )
}

// Live badge with neon pulse
export function LiveBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full status-live text-sm font-bold ${className}`}>
      <span className="w-2 h-2 rounded-full bg-[#EF4444] live-pulse" />
      CANLI
    </span>
  )
}

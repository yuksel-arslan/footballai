'use client'

interface GradientTitleProps {
  children: React.ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4'
  className?: string
  gradient?: 'primary' | 'secondary' | 'accent' | 'rainbow'
}

const gradients = {
  primary: 'from-primary via-purple-500 to-pink-500',
  secondary: 'from-secondary via-emerald-400 to-teal-400',
  accent: 'from-amber-400 via-orange-500 to-red-500',
  rainbow: 'from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500',
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
}: GradientTitleProps) {
  const Tag = as

  return (
    <Tag
      className={`font-bold tracking-tight bg-gradient-to-r ${gradients[gradient]} bg-clip-text text-transparent ${sizes[as]} ${className}`}
    >
      {children}
    </Tag>
  )
}

// Section title with gradient underline
interface SectionTitleProps {
  children: React.ReactNode
  description?: string
  gradient?: 'primary' | 'secondary' | 'accent'
}

export function SectionTitle({ children, description, gradient = 'primary' }: SectionTitleProps) {
  return (
    <div className="mb-8">
      <h2 className={`text-2xl md:text-3xl font-bold bg-gradient-to-r ${gradients[gradient]} bg-clip-text text-transparent`}>
        {children}
      </h2>
      {description && (
        <p className="text-muted-foreground mt-2">{description}</p>
      )}
      <div className={`h-1 w-20 mt-3 rounded-full bg-gradient-to-r ${gradients[gradient]}`} />
    </div>
  )
}

// Page header with gradient title
interface PageHeaderProps {
  title: string
  description?: string
  gradient?: 'primary' | 'secondary' | 'accent'
  badge?: {
    icon?: React.ReactNode
    text: string
  }
}

export function PageHeader({ title, description, gradient = 'primary', badge }: PageHeaderProps) {
  return (
    <div className="relative py-12 lg:py-16">
      {/* Background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-r ${gradients[gradient]} opacity-20 rounded-full blur-3xl -translate-y-1/2`} />
      </div>

      <div className="relative">
        {badge && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
            {badge.icon}
            <span className="text-sm font-medium">{badge.text}</span>
          </div>
        )}

        <h1 className={`text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r ${gradients[gradient]} bg-clip-text text-transparent`}>
          {title}
        </h1>

        {description && (
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

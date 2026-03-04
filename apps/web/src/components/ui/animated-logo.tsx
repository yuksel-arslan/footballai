'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function AnimatedLogo({
  size = 40,
  className = '',
}: {
  size?: number
  className?: string
}) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <span
      className={`font-bold select-none ${className}`}
      style={{ fontSize: size * 0.35 }}
    >
      <span style={{ color: isDark ? '#ffffff' : '#1a1a2e' }}>Football</span>
      <span style={{ color: '#2563EB' }}>AI</span>
    </span>
  )
}

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
  const fontSize = size * 0.35
  const iconSize = size * 0.42

  return (
    <span
      className={`inline-flex items-center select-none ${className}`}
      style={{ gap: size * 0.08 }}
    >
      <img
        src="/logo.svg"
        alt="FootballAI"
        width={iconSize}
        height={iconSize}
        style={{ width: iconSize, height: iconSize, flexShrink: 0 }}
        draggable={false}
      />
      <span className="font-bold" style={{ fontSize }}>
        <span style={{ color: isDark ? '#ffffff' : '#1a1a2e' }}>Football</span>
        <span style={{ color: '#00E07A' }}>AI</span>
      </span>
    </span>
  )
}

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
  const textColor = isDark ? '#ffffff' : '#1a1a2e'
  const accentColor = '#2563EB'
  const ballBg = isDark ? '#e0e0e0' : '#ffffff'
  const panelColor = isDark ? '#2563EB' : '#1a1a2e'

  const height = size
  const width = size * 3

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 300 80"
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label="FootballAI"
    >
      {/* Football icon */}
      <g transform="translate(5, 5)">
        <circle cx="35" cy="35" r="33" fill={ballBg} stroke={panelColor} strokeWidth="1.5" />
        {/* Pentagon panels */}
        <g fill={panelColor}>
          <polygon points="35,12 43,20 40,30 30,30 27,20" />
          <polygon points="55,28 58,38 50,44 44,38 48,28" />
          <polygon points="50,54 44,60 34,58 34,48 42,46" />
          <polygon points="20,54 26,46 36,48 36,58 26,60" />
          <polygon points="15,28 22,28 26,38 20,44 12,38" />
        </g>
        {/* Shine */}
        <ellipse cx="22" cy="20" rx="10" ry="7" fill="rgba(255,255,255,0.3)" transform="rotate(-20 22 20)" />
      </g>

      {/* "Football" text */}
      <text
        x="80"
        y="52"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="36"
        fontWeight="700"
        fill={textColor}
        letterSpacing="-0.5"
      >
        Football
      </text>

      {/* "AI" text with accent */}
      <text
        x="242"
        y="52"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="36"
        fontWeight="800"
        fill={accentColor}
        letterSpacing="-0.5"
      >
        AI
      </text>
    </svg>
  )
}

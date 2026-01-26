'use client'

import { useId } from 'react'

export function AnimatedLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  const id = useId()
  const ballGradientId = `ballGrad-${id}`
  const darkGradientId = `darkGrad-${id}`
  const shadowId = `shadow-${id}`
  const glowId = `glow-${id}`

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="animate-spin-slow"
      >
        <defs>
          {/* Ball gradient - white to light gray */}
          <linearGradient id={ballGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff"/>
            <stop offset="100%" stopColor="#e5e5e5"/>
          </linearGradient>

          {/* Dark panels gradient */}
          <linearGradient id={darkGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a1a2e"/>
            <stop offset="100%" stopColor="#16213e"/>
          </linearGradient>

          {/* Drop shadow */}
          <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#000" floodOpacity="0.25"/>
          </filter>

          {/* Glow effect */}
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Main ball circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill={`url(#${ballGradientId})`}
          filter={`url(#${shadowId})`}
        />

        {/* Stitching lines */}
        <g stroke="#cccccc" strokeWidth="0.5" fill="none" opacity="0.5">
          <path d="M50,5 Q30,25 30,50 Q30,75 50,95"/>
          <path d="M50,5 Q70,25 70,50 Q70,75 50,95"/>
          <path d="M5,50 Q25,30 50,30 Q75,30 95,50"/>
          <path d="M5,50 Q25,70 50,70 Q75,70 95,50"/>
        </g>

        {/* Pentagon panels (classic football pattern) */}
        <g fill={`url(#${darkGradientId})`} filter={`url(#${glowId})`}>
          {/* Center pentagon */}
          <polygon points="50,30 61,38 57,52 43,52 39,38"/>

          {/* Top */}
          <polygon points="50,8 58,16 54,24 46,24 42,16"/>

          {/* Top right */}
          <polygon points="72,22 80,32 74,42 64,38 66,28"/>

          {/* Right */}
          <polygon points="85,50 82,62 72,64 68,54 76,46"/>

          {/* Bottom right */}
          <polygon points="72,78 64,82 54,76 58,66 68,68"/>

          {/* Bottom */}
          <polygon points="50,92 42,84 46,76 54,76 58,84"/>

          {/* Bottom left */}
          <polygon points="28,78 32,68 42,66 46,76 36,82"/>

          {/* Left */}
          <polygon points="15,50 24,46 32,54 28,64 18,62"/>

          {/* Top left */}
          <polygon points="28,22 34,28 36,38 26,42 20,32"/>
        </g>

        {/* Highlight/shine */}
        <ellipse
          cx="32"
          cy="28"
          rx="14"
          ry="9"
          fill="rgba(255,255,255,0.35)"
          transform="rotate(-30 32 28)"
        />
        <ellipse
          cx="26"
          cy="36"
          rx="6"
          ry="4"
          fill="rgba(255,255,255,0.2)"
          transform="rotate(-30 26 36)"
        />
      </svg>
    </div>
  )
}

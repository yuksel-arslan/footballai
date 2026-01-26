'use client'

import { useId } from 'react'

export function AnimatedLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  const id = useId()
  const ballGradientId = `ballGradient-${id}`
  const pentagonGradientId = `pentagonGradient-${id}`
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
          <linearGradient id={ballGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="50%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <linearGradient id={pentagonGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="100%" stopColor="#0369A1" />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
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
          filter={`url(#${glowId})`}
        />

        {/* Pentagon patterns for football look */}
        <g fill={`url(#${pentagonGradientId})`} opacity="0.8">
          {/* Center pentagon */}
          <polygon points="50,25 62,35 58,50 42,50 38,35" />

          {/* Top pentagon */}
          <polygon points="50,5 58,15 50,22 42,15" />

          {/* Right pentagon */}
          <polygon points="75,30 82,45 72,52 65,40" />

          {/* Bottom right pentagon */}
          <polygon points="70,65 75,80 60,82 55,70" />

          {/* Bottom left pentagon */}
          <polygon points="30,65 45,70 40,82 25,80" />

          {/* Left pentagon */}
          <polygon points="25,30 35,40 28,52 18,45" />
        </g>

        {/* Highlight */}
        <ellipse
          cx="35"
          cy="30"
          rx="12"
          ry="8"
          fill="rgba(255,255,255,0.3)"
          transform="rotate(-30 35 30)"
        />
      </svg>
    </div>
  )
}

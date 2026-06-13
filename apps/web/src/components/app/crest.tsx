'use client'

import { useState } from 'react'
import type { Team } from '@/lib/api'
import { flagUrl } from '@/lib/country-flags'

type Size = 'sm' | 'md' | 'lg'
const PX: Record<Size, number> = { sm: 34, md: 44, lg: 50 }

function codeFor(team: Team): string {
  if (team.code) return team.code.slice(0, 3).toUpperCase()
  const words = team.name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0] + (words[2]?.[0] ?? '')).toUpperCase()
  }
  return team.name.slice(0, 3).toUpperCase()
}

function hueFor(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return h
}

/**
 * Team badge: real crest image when available, else a country flag for national
 * teams (so flags show even on surfaces that pass a name-only team), else a
 * coloured monogram. Falls through the list if an image fails to load, so a
 * missing/broken logo (e.g. Türkiye) still resolves to a flag or monogram.
 */
export function Crest({ team, size = 'sm' }: { team: Team; size?: Size }) {
  const px = PX[size]
  // Ordered candidates: stored crest first, then the country flag.
  const sources = [team.logoUrl, flagUrl(team.name)].filter(Boolean) as string[]
  const [idx, setIdx] = useState(0)
  const src = sources[idx]

  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={px}
        height={px}
        loading="lazy"
        className={`crest ${size}`}
        style={{ objectFit: 'contain', background: 'rgba(255,255,255,0.04)' }}
        onError={() => setIdx((i) => i + 1)}
      />
    )
  }

  const hue = hueFor(team.name)
  return (
    <div
      className={`crest ${size}`}
      style={{
        background: `linear-gradient(150deg, hsl(${hue} 58% 46%), hsl(${hue} 58% 28%))`,
      }}
    >
      {codeFor(team)}
    </div>
  )
}

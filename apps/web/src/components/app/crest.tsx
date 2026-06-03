'use client'

import type { Team } from '@/lib/api'

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

/** Team badge: real crest image when available, otherwise a coloured monogram. */
export function Crest({ team, size = 'sm' }: { team: Team; size?: Size }) {
  if (team.logoUrl) {
    const px = PX[size]
    return (
      <img
        src={team.logoUrl}
        alt=""
        width={px}
        height={px}
        loading="lazy"
        className={`crest ${size}`}
        style={{ objectFit: 'contain', background: 'rgba(255,255,255,0.04)' }}
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

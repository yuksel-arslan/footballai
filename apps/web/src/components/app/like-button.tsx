'use client'

import { Heart } from 'lucide-react'
import { useLikes, useToggleLike } from '@/hooks/use-likes'

/**
 * Anonymous like (heart + count) for a match's report. No login required — a
 * per-browser voter id keeps it one-per-device. Optimistic toggle.
 */
export function LikeButton({
  fixtureId,
  size = 'md',
}: {
  fixtureId: number
  size?: 'sm' | 'md'
}) {
  const { data } = useLikes(fixtureId)
  const toggle = useToggleLike(fixtureId)
  const liked = !!data?.liked
  const count = data?.count ?? 0
  const px = size === 'sm' ? 14 : 16

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle.mutate()
      }}
      aria-pressed={liked}
      title={liked ? 'Beğeniyi geri al' : 'Beğen'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: size === 'sm' ? '4px 10px' : '6px 12px',
        borderRadius: 999,
        border: '1px solid var(--line2)',
        background: liked
          ? 'color-mix(in srgb, var(--neg, #ef4444) 12%, transparent)'
          : 'transparent',
        color: liked ? 'var(--neg, #ef4444)' : 'var(--txt)',
        fontSize: size === 'sm' ? 12 : 13,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      <Heart
        size={px}
        fill={liked ? 'var(--neg, #ef4444)' : 'none'}
        color={liked ? 'var(--neg, #ef4444)' : 'currentColor'}
      />
      {count > 0 ? count : 'Beğen'}
    </button>
  )
}

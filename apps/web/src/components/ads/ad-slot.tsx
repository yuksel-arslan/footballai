'use client'

import { useEffect, useRef, useState } from 'react'
import { ADSENSE_CLIENT, ADS_ENABLED } from '@/lib/ads'

/**
 * A single responsive AdSense unit. Renders nothing unless ads are enabled and
 * a slot ID is provided, so it never shows on an unconfigured build. Consent is
 * handled by Google's certified consent message (CMP) + Consent Mode, so this
 * component doesn't gate on a local choice. Lazy: the ad is only requested once
 * the slot scrolls near the viewport, protecting LCP / Core Web Vitals (and
 * therefore SEO). Always labelled "Reklam" per policy.
 */
export function AdSlot({
  slot,
  format = 'auto',
  className,
  style,
  minHeight = 120,
}: {
  slot: string
  format?: string
  className?: string
  style?: React.CSSProperties
  minHeight?: number
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const pushed = useRef(false)
  const [near, setNear] = useState(false)
  const active = ADS_ENABLED && !!slot

  useEffect(() => {
    if (!active) return
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setNear(true)
          io.disconnect()
        }
      },
      { rootMargin: '250px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [active])

  useEffect(() => {
    if (near && active && !pushed.current) {
      pushed.current = true
      try {
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch {
        // adsbygoogle not ready yet; will retry on next mount
        pushed.current = false
      }
    }
  }, [near, active])

  if (!active) return null

  return (
    <div ref={wrapRef} className={`adslot ${className ?? ''}`}>
      <span className="adslot-label">Reklam</span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight, ...style }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}

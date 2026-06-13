/**
 * Ad / AdSense configuration. Everything is env-gated: when the publisher ID
 * isn't set, NOTHING loads and no ad markup renders — so the site stays clean
 * in development and while waiting for AdSense approval. Per-unit slot IDs are
 * also env-driven, so a placement only renders once its slot exists.
 */
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || ''

/** True only for a real `ca-pub-…` publisher ID. */
export const ADS_ENABLED = /^ca-pub-\d+$/.test(ADSENSE_CLIENT)

/** AdSense ad-unit slot IDs (created in the AdSense dashboard). A placement
 * renders only when its slot is set, so we can ship placements before the
 * units exist. */
export const AD_SLOTS = {
  inArticle: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INARTICLE || '',
  inFeed: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INFEED || '',
} as const

declare global {
  interface Window {
    adsbygoogle?: unknown[]
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

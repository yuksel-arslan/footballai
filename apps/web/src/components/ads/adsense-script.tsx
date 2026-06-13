'use client'

import Script from 'next/script'
import { ADSENSE_CLIENT, ADS_ENABLED } from '@/lib/ads'

/**
 * Loads the AdSense library, lazily and only when a publisher ID is set. The
 * Consent Mode v2 defaults (denied) are set earlier via an inline script in
 * the root layout <head>, so they apply before this library initialises.
 */
export function AdSenseScript() {
  if (!ADS_ENABLED) return null
  return (
    <Script
      id="adsbygoogle-lib"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
    />
  )
}

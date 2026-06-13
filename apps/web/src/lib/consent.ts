'use client'

import { useEffect, useState } from 'react'

/**
 * Lightweight cookie/ads consent (KVKK/GDPR) backed by localStorage and wired
 * to Google Consent Mode v2. Defaults are set to "denied" before AdSense loads
 * (see the inline script in the root layout); the user's choice updates them.
 * Ads are only rendered once a choice exists (see AdSlot), and when denied
 * AdSense still serves non-personalized ads — so we stay compliant either way.
 */
const KEY = 'cookie-consent'
const EVENT = 'consentchange'

export type ConsentState = 'granted' | 'denied'

export function getConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null
  const v = window.localStorage.getItem(KEY)
  return v === 'granted' || v === 'denied' ? v : null
}

export function setConsent(value: ConsentState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, value)
  const flag = value === 'granted' ? 'granted' : 'denied'
  window.gtag?.('consent', 'update', {
    ad_storage: flag,
    ad_user_data: flag,
    ad_personalization: flag,
    analytics_storage: flag,
  })
  window.dispatchEvent(new Event(EVENT))
}

/** Reactive consent state: null until the user decides, then their choice. */
export function useConsent(): ConsentState | null {
  const [state, setState] = useState<ConsentState | null>(null)
  useEffect(() => {
    setState(getConsent())
    const handler = () => setState(getConsent())
    window.addEventListener(EVENT, handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener(EVENT, handler)
      window.removeEventListener('storage', handler)
    }
  }, [])
  return state
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ADS_ENABLED } from '@/lib/ads'
import { getConsent, setConsent } from '@/lib/consent'

/**
 * KVKK/GDPR cookie & ads consent banner. Shown only when ads are enabled and
 * the user hasn't decided yet. "Reddet" still allows non-personalized ads via
 * Consent Mode, so we remain compliant without blocking revenue.
 */
export function ConsentBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (ADS_ENABLED && getConsent() === null) setShow(true)
  }, [])

  if (!show) return null

  const decide = (value: 'granted' | 'denied') => {
    setConsent(value)
    setShow(false)
  }

  return (
    <div className="consent-banner" role="dialog" aria-label="Çerez tercihi">
      <div className="consent-text">
        Deneyiminizi iyileştirmek ve reklamları göstermek için çerezler
        kullanıyoruz. “Kabul et” ile kişiselleştirilmiş reklamlara izin
        verirsiniz; “Reddet” derseniz yalnızca kişiselleştirilmemiş reklamlar
        gösterilir. Ayrıntılar için{' '}
        <Link href="/legal/cerezler">Çerez Politikası</Link> ve{' '}
        <Link href="/legal/gizlilik">Gizlilik Politikası</Link>.
      </div>
      <div className="consent-actions">
        <button className="consent-btn ghost" onClick={() => decide('denied')}>
          Reddet
        </button>
        <button
          className="consent-btn primary"
          onClick={() => decide('granted')}
        >
          Kabul et
        </button>
      </div>
    </div>
  )
}

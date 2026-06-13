import Link from 'next/link'

/**
 * Site footer: legal links (required for AdSense / KVKK) plus a neutral
 * information-only disclaimer. Rendered on all non-bare pages.
 */
export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <nav className="site-footer-links">
          <Link href="/legal/hakkinda">Hakkında</Link>
          <Link href="/legal/gizlilik">Gizlilik Politikası</Link>
          <Link href="/legal/cerezler">Çerez Politikası</Link>
          <Link href="/legal/hakkinda#iletisim">İletişim</Link>
        </nav>
        <p className="site-footer-disc">
          FootballAI tahmin ve analizleri yalnızca bilgilendirme ve eğlence
          amaçlıdır; kesinlik veya kazanç garantisi vermez, tavsiye niteliği
          taşımaz.
        </p>
        <p className="site-footer-copy">© {year} FootballAI</p>
      </div>
    </footer>
  )
}

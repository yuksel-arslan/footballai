import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Bahis Defterim' }

export default function JournalPage() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">Kişisel</div>
          <h1 style={{ marginTop: 6 }}>Bahis Defterim</h1>
          <div className="sub" style={{ marginTop: 4 }}>
            Takip ettiğin tahminler, sonuçları ve birikimli getirin.
          </div>
        </div>
      </div>
      <div className="card">
        <p className="muted" style={{ margin: 0 }}>
          Defterin yakında burada olacak.
        </p>
      </div>
    </div>
  )
}

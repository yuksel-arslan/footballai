import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Performans Merkezi' }

export default function PerformancePage() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="kicker">AI · Model</div>
          <h1 style={{ marginTop: 6 }}>Performans Merkezi</h1>
          <div className="sub" style={{ marginTop: 4 }}>
            Modelin geçmiş isabet oranı, getirisi ve kapanış oranını geçme
            yüzdesi.
          </div>
        </div>
      </div>
      <div className="card">
        <p className="muted" style={{ margin: 0 }}>
          Performans verileri yakında bu sayfada yayınlanacak.
        </p>
      </div>
    </div>
  )
}

'use client'

import { Youtube } from 'lucide-react'

/**
 * "Maç Özeti" — for finished matches, a link to re-watch the game's highlights
 * on YouTube. Uses a search query built from the team names (no video IDs to
 * store, no API key, no cost), so it always resolves to the latest uploads.
 */
export function MatchHighlights({
  home,
  away,
  league,
}: {
  home: string
  away: string
  league?: string
}) {
  const query = [home, away, league, 'maç özeti'].filter(Boolean).join(' ')
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-h">
        <h3>Maç Özeti</h3>
        <span className="hint">YouTube</span>
      </div>
      <p className="disc" style={{ marginTop: 0, marginBottom: 14 }}>
        Maçı tekrar izlemek mi istiyorsun? Geniş özet ve önemli anları
        YouTube’da bulabilirsin.
      </p>
      <a
        className="cta"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
      >
        <Youtube size={18} /> Özeti YouTube’da izle
      </a>
    </div>
  )
}

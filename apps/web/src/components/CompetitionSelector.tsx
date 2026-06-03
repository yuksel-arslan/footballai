'use client'

import { Check } from 'lucide-react'
import { LEAGUES } from '@/lib/reference-data'
import { useCompetitions } from '@/stores/competitions.store'

const CODES = Object.keys(LEAGUES)

/**
 * Per-user competition picker shown at the top of the dashboard. The user's
 * choice is saved in the browser and used by pages to filter what they show.
 */
export function CompetitionSelector() {
  const { selected, toggle, selectAll } = useCompetitions()
  const allOn = selected.length === CODES.length

  return (
    <div className="neon-card rounded-xl p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold sm:text-base">
          Takip ettiğin ligler
        </h3>
        <span className="text-xs text-muted-foreground">
          {allOn ? 'Tümü' : `${selected.length}/${CODES.length}`}
        </span>
        <button
          type="button"
          onClick={selectAll}
          disabled={allOn}
          className="ml-auto text-[11px] font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
        >
          Tümünü seç
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {CODES.map((code) => {
          const lg = LEAGUES[code]
          const on = selected.includes(code)
          return (
            <button
              key={code}
              type="button"
              onClick={() => toggle(code)}
              aria-pressed={on}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                on
                  ? 'border-primary/40 bg-primary/15 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/30'
              }`}
            >
              {lg.logoUrl && (
                <img
                  src={lg.logoUrl}
                  alt=""
                  className="h-4 w-4 object-contain"
                  loading="lazy"
                />
              )}
              <span>{lg.name}</span>
              {on && <Check className="h-3 w-3 text-primary" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

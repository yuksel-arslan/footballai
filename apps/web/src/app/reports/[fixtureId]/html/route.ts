import { NextRequest, NextResponse } from 'next/server'
import { GATEWAY_URL } from '@/lib/service-urls'

/**
 * GET /reports/[fixtureId]/html
 *
 * Renders a fixture's post-match report — stored as JSON in the DB — into a
 * self-contained, shareable/printable HTML document. The reports list links
 * here so a click opens the report as HTML (the data stays JSON server-side).
 */

interface FormEntry {
  result: 'W' | 'D' | 'L'
  opponent: string
  score: string
  date: string
}
interface TeamStatsBlock {
  played: number
  wins: number
  draws: number
  losses: number
  gfAvg: number
  gaAvg: number
  over25Rate: number
  bttsRate: number
  cleanSheets: number
  streak: string
}
interface TimelineEvent {
  minute: number
  type: 'goal' | 'own_goal' | 'penalty' | 'yellow' | 'red' | 'sub'
  team: 'home' | 'away'
  player: string
  detail?: string
}
interface ReportData {
  homeScore: number
  awayScore: number
  outcome: 'home' | 'draw' | 'away'
  home: string
  away: string
  league: string
  matchDate: string
  prediction: {
    existed: boolean
    pickLabel?: string
    correct?: boolean
    probOnActual?: number
    predictedScore?: string
    confidence?: number
    probs?: { home: number; draw: number; away: number }
  }
  surprise?: 'major' | 'mild' | null
  preForm?: { home: FormEntry[]; away: FormEntry[] }
  h2h?: { homeWins: number; draws: number; awayWins: number; total: number }
  valueBet?: {
    pickLabel: string
    odds: number
    won: boolean
    profitUnits: number
  }
  stats?: { home: TeamStatsBlock; away: TeamStatsBlock }
  timeline?: TimelineEvent[]
  takeaways: string[]
}
interface MatchReportRow {
  fixtureId: number
  summary: string
  data: ReportData
  createdAt: string
}

const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const fmtDate = (iso: string): string => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return esc(iso)
  const p = (n: number) => `${n}`.padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const formPips = (form: FormEntry[] = []): string =>
  form.length === 0
    ? '—'
    : form
        .map((e) => {
          const cls = e.result === 'W' ? 'w' : e.result === 'L' ? 'l' : 'd'
          const label = e.result === 'W' ? 'G' : e.result === 'L' ? 'M' : 'B'
          return `<span class="pip ${cls}" title="${esc(e.score)} vs ${esc(e.opponent)} (${esc(e.date)})">${label}</span>`
        })
        .join('')

function statRow(label: string, home: string, away: string): string {
  return `<tr><td class="h">${esc(home)}</td><td class="lbl">${esc(label)}</td><td class="a">${esc(away)}</td></tr>`
}

function renderReportHtml(row: MatchReportRow): string {
  const d = row.data
  const home = esc(d.home)
  const away = esc(d.away)
  const winner =
    d.outcome === 'home' ? home : d.outcome === 'away' ? away : null
  const p = d.prediction
  const s = d.stats
  const events = (d.timeline ?? []).filter((e) =>
    ['goal', 'own_goal', 'penalty', 'yellow', 'red'].includes(e.type)
  )

  const predBlock = p?.existed
    ? `<div class="sec-title">Beklenti vs Gerçekleşme</div>
       <p class="verdict ${p.correct ? 'ok' : 'miss'}">${p.correct ? '✓ Model tahmini tuttu' : '✗ Model tahmini tutmadı'}</p>
       <p class="muted">Maç öncesi model <b>${esc(p.pickLabel)}</b> demişti${p.predictedScore ? ` (tahmini skor ${esc(p.predictedScore)})` : ''}${p.probOnActual != null ? `; gerçekleşen sonuca verdiği olasılık %${esc(p.probOnActual)}` : ''}.</p>`
    : ''

  const valueBlock = d.valueBet
    ? `<div class="sec-title">Değer Bahsi Sonucu</div>
       <p>Motorun seçimi: <b>${esc(d.valueBet.pickLabel)}</b> @${esc(d.valueBet.odds.toFixed(2))} → <b class="${d.valueBet.won ? 'pos' : 'neg'}">${d.valueBet.won ? `KAZANDI (+${esc(d.valueBet.profitUnits.toFixed(2))} birim)` : 'KAYBETTİ (−1.00 birim)'}</b></p>`
    : ''

  const formBlock = d.preForm
    ? `<div class="sec-title">Maç Öncesi Form (son 5)</div>
       <div class="forms"><span>${formPips(d.preForm.home)}</span><span class="muted">${home} · ${away}</span><span>${formPips(d.preForm.away)}</span></div>`
    : ''

  const statsBlock = s
    ? `<div class="sec-title">Son 10 Maç İstatistiği</div>
       <table class="stats">
         <thead><tr><th>${home}</th><th></th><th>${away}</th></tr></thead>
         <tbody>
           ${statRow('Galibiyet-Beraberlik-Mağlubiyet', `${s.home.wins}-${s.home.draws}-${s.home.losses}`, `${s.away.wins}-${s.away.draws}-${s.away.losses}`)}
           ${statRow('Gol ort. (attığı / yediği)', `${s.home.gfAvg.toFixed(1)} / ${s.home.gaAvg.toFixed(1)}`, `${s.away.gfAvg.toFixed(1)} / ${s.away.gaAvg.toFixed(1)}`)}
           ${statRow('Üst 2.5 oranı', `%${s.home.over25Rate}`, `%${s.away.over25Rate}`)}
           ${statRow('KG Var oranı', `%${s.home.bttsRate}`, `%${s.away.bttsRate}`)}
           ${statRow('Gol yemediği maç / Seri', `${s.home.cleanSheets} / ${s.home.streak || '—'}`, `${s.away.cleanSheets} / ${s.away.streak || '—'}`)}
         </tbody>
       </table>`
    : ''

  const h2hBlock =
    d.h2h && d.h2h.total > 0
      ? `<div class="sec-title">Aralarındaki Maçlar</div>
         <p>${home} <b>${d.h2h.homeWins}</b> · Beraberlik <b>${d.h2h.draws}</b> · ${away} <b>${d.h2h.awayWins}</b> <span class="muted">(${d.h2h.total} maç)</span></p>`
      : ''

  const timelineBlock =
    events.length > 0
      ? `<div class="sec-title">Maçın Akışı</div>
         <ul class="timeline">${events
           .sort((a, b) => a.minute - b.minute)
           .map((e) => {
             const icon =
               e.type === 'red'
                 ? '🟥'
                 : e.type === 'yellow'
                   ? '🟨'
                   : e.type === 'penalty'
                     ? '⚽ (P)'
                     : e.type === 'own_goal'
                       ? '⚽ (KK)'
                       : '⚽'
             const team = e.team === 'home' ? home : away
             return `<li><span class="min">${esc(e.minute)}'</span> ${icon} <b>${esc(e.player)}</b> <span class="muted">(${team})</span></li>`
           })
           .join('')}</ul>`
      : ''

  const takeawaysBlock =
    d.takeaways && d.takeaways.length > 0
      ? `<div class="sec-title">Gelecek Maçlara Çıkarımlar</div>
         <ul class="takeaways">${d.takeaways.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`
      : ''

  const surpriseTag = d.surprise
    ? `<span class="tag ${d.surprise === 'major' ? 'neg' : 'warn'}">${d.surprise === 'major' ? 'BÜYÜK SÜRPRİZ' : 'Beklenmedik sonuç'}</span>`
    : ''

  return `<!doctype html>
<html lang="tr"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${home} ${esc(d.homeScore)}-${esc(d.awayScore)} ${away} — Maç Raporu</title>
<meta name="description" content="${home} ${esc(d.homeScore)}-${esc(d.awayScore)} ${away} maç sonu raporu — ${esc(d.league)}."/>
<style>
  :root{--ink:#14141b;--mut:#6b7280;--line:#e6e8ee;--c1:#059669;--c2:#0891b2;--pos:#059669;--neg:#e11d48;--warn:#b45309;--bg:#f4f6f9;--card:#fff}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;-webkit-font-smoothing:antialiased}
  .wrap{max-width:760px;margin:0 auto;padding:28px 20px 60px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:26px 28px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
  .kicker{font-size:11px;letter-spacing:.12em;color:var(--mut);text-transform:uppercase}
  h1{font-size:24px;margin:6px 0 2px;font-weight:800}
  .score{font-size:30px;font-weight:800;margin:14px 0 2px}
  .muted{color:var(--mut)}
  .tag{display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;background:#eef1f5;color:var(--mut);margin-left:6px}
  .tag.neg{background:#fde7ec;color:var(--neg)} .tag.warn{background:#fdf0d9;color:var(--warn)}
  .sec-title{font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--c1);margin:22px 0 8px}
  .verdict{font-weight:800;margin:0} .verdict.ok{color:var(--pos)} .verdict.miss{color:var(--neg)}
  .pos{color:var(--pos)} .neg{color:var(--neg)}
  .forms{display:flex;justify-content:space-between;align-items:center;gap:12px}
  .pip{display:inline-flex;width:20px;height:20px;border-radius:6px;align-items:center;justify-content:center;font-size:10.5px;font-weight:800;color:#fff;margin-right:3px}
  .pip.w{background:var(--pos)} .pip.l{background:var(--neg)} .pip.d{background:#94a3b8}
  table.stats{width:100%;border-collapse:collapse;font-size:13.5px}
  table.stats th{color:var(--mut);font-weight:600;font-size:12px;padding:4px 0}
  table.stats td{padding:7px 0;border-bottom:1px solid var(--line)}
  table.stats td.h{text-align:right;font-weight:600;width:38%} table.stats td.a{font-weight:600;width:38%}
  table.stats td.lbl{text-align:center;color:var(--mut);font-size:11.5px}
  ul.timeline{list-style:none;padding:0;margin:0} ul.timeline li{padding:3px 0;font-size:13.5px}
  ul.timeline .min{display:inline-block;width:34px;color:var(--mut);text-align:right}
  ul.takeaways{margin:0;padding-left:18px} ul.takeaways li{margin:3px 0}
  .narrative{font-size:15px;line-height:1.7}
  .disc{margin-top:22px;padding-top:14px;border-top:1px solid var(--line);font-size:11px;line-height:1.55;color:var(--mut)}
  .foot{margin-top:14px;font-size:11px;color:var(--mut)}
  @media print{body{background:#fff}.card{border:0;box-shadow:none;padding:0}}
</style>
</head><body><div class="wrap"><div class="card">
  <div class="kicker">Maç Sonu Raporu${surpriseTag}</div>
  <h1>${home} <span class="muted">vs</span> ${away}</h1>
  <div class="muted">${esc(d.league)} · ${fmtDate(d.matchDate)}</div>
  <div class="score">${home} ${esc(d.homeScore)} - ${esc(d.awayScore)} ${away}</div>
  <div class="muted">${winner ? `${winner} kazandı` : 'Beraberlik'}</div>
  ${predBlock}
  ${valueBlock}
  ${formBlock}
  ${statsBlock}
  ${h2hBlock}
  ${timelineBlock}
  <div class="sec-title">Analiz</div>
  <p class="narrative">${esc(row.summary)}</p>
  ${takeawaysBlock}
  <div class="disc"><b>Hukuki sorumluluk reddi:</b> Bu rapor yalnızca bilgilendirme ve eğlence amaçlıdır; yatırım, bahis veya finansal tavsiye niteliği taşımaz. Tahminler ve analizler kesinlik içermez. Bahis/oyun içeren kararların sorumluluğu tamamen kullanıcıya aittir. 18 yaş ve üzeri. Sorumlu oyna.</div>
  <div class="foot">FootballAI · ${fmtDate(row.createdAt)} tarihinde üretildi</div>
</div></div></body></html>`
}

function notFoundHtml(): string {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"/><title>Rapor bulunamadı</title></head><body style="font:15px Inter,system-ui,sans-serif;padding:40px;color:#14141b"><h1>Rapor bulunamadı</h1><p>Bu maçın raporu henüz hazır değil. Maç bittiğinde otomatik üretilir.</p></body></html>`
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fixtureId: string }> }
) {
  const { fixtureId } = await params
  const htmlHeaders = { 'content-type': 'text/html; charset=utf-8' }

  if (!GATEWAY_URL) {
    return new NextResponse(notFoundHtml(), {
      status: 503,
      headers: htmlHeaders,
    })
  }
  try {
    const res = await fetch(
      `${GATEWAY_URL}/api/predictions/report/${encodeURIComponent(fixtureId)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(20000) }
    )
    const json = (await res.json().catch(() => ({}))) as {
      data?: MatchReportRow
    }
    const row = json?.data
    if (!row || !row.data) {
      return new NextResponse(notFoundHtml(), {
        status: 404,
        headers: htmlHeaders,
      })
    }
    return new NextResponse(renderReportHtml(row), {
      status: 200,
      headers: { ...htmlHeaders, 'cache-control': 'public, max-age=300' },
    })
  } catch {
    return new NextResponse(notFoundHtml(), {
      status: 502,
      headers: htmlHeaders,
    })
  }
}

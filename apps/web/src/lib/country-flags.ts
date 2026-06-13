/**
 * Country flag resolver for national teams. Many surfaces pass a team with no
 * logoUrl (e.g. the value list builds a name-only stub), so national teams
 * showed only a letter monogram — and a team whose stored logo is missing or
 * broken (Türkiye is a frequent case) showed nothing. This maps a team/country
 * name (TR or EN, with provider aliases) to an ISO 3166-1 alpha-2 code and a
 * flag image from flagcdn.com, used as a reliable fallback.
 *
 * Note: flag emojis are NOT used — they don't render on Windows — so we serve
 * real flag images instead.
 */

const norm = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics (Türkiye → Turkiye)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

// name (normalized) → ISO 3166-1 alpha-2. Includes English + Turkish names and
// cross-provider aliases (Football-Data vs API-Football).
const ISO2: Record<string, string> = {
  // — UEFA —
  turkey: 'tr',
  turkiye: 'tr',
  germany: 'de',
  almanya: 'de',
  france: 'fr',
  fransa: 'fr',
  england: 'gb-eng',
  ingiltere: 'gb-eng',
  spain: 'es',
  ispanya: 'es',
  italy: 'it',
  italya: 'it',
  portugal: 'pt',
  portekiz: 'pt',
  netherlands: 'nl',
  hollanda: 'nl',
  belgium: 'be',
  belcika: 'be',
  croatia: 'hr',
  hirvatistan: 'hr',
  switzerland: 'ch',
  isvicre: 'ch',
  austria: 'at',
  avusturya: 'at',
  poland: 'pl',
  polonya: 'pl',
  ukraine: 'ua',
  ukrayna: 'ua',
  scotland: 'gb-sct',
  iskocya: 'gb-sct',
  wales: 'gb-wls',
  galler: 'gb-wls',
  denmark: 'dk',
  danimarka: 'dk',
  sweden: 'se',
  isvec: 'se',
  norway: 'no',
  norvec: 'no',
  serbia: 'rs',
  sirbistan: 'rs',
  'czech republic': 'cz',
  czechia: 'cz',
  cekya: 'cz',
  greece: 'gr',
  yunanistan: 'gr',
  hungary: 'hu',
  macaristan: 'hu',
  romania: 'ro',
  romanya: 'ro',
  russia: 'ru',
  rusya: 'ru',
  ireland: 'ie',
  irlanda: 'ie',
  'republic of ireland': 'ie',
  'northern ireland': 'gb-nir',
  iceland: 'is',
  izlanda: 'is',
  finland: 'fi',
  finlandiya: 'fi',
  'bosnia and herzegovina': 'ba',
  bosnia: 'ba',
  'bosna hersek': 'ba',
  slovakia: 'sk',
  slovenya: 'si',
  slovenia: 'si',
  slovakya: 'sk',
  albania: 'al',
  arnavutluk: 'al',
  'north macedonia': 'mk',
  georgia: 'ge',
  gurcistan: 'ge',
  azerbaijan: 'az',
  azerbaycan: 'az',
  bulgaria: 'bg',
  bulgaristan: 'bg',
  montenegro: 'me',
  kosovo: 'xk',
  // — South America —
  brazil: 'br',
  brezilya: 'br',
  argentina: 'ar',
  arjantin: 'ar',
  uruguay: 'uy',
  colombia: 'co',
  kolombiya: 'co',
  chile: 'cl',
  sili: 'cl',
  peru: 'pe',
  ecuador: 'ec',
  ekvador: 'ec',
  paraguay: 'py',
  bolivia: 'bo',
  bolivya: 'bo',
  venezuela: 've',
  // — North/Central America —
  'united states': 'us',
  usa: 'us',
  'united states of america': 'us',
  'amerika birlesik devletleri': 'us',
  mexico: 'mx',
  meksika: 'mx',
  canada: 'ca',
  kanada: 'ca',
  'costa rica': 'cr',
  panama: 'pa',
  honduras: 'hn',
  jamaica: 'jm',
  haiti: 'ht',
  // — Africa —
  morocco: 'ma',
  fas: 'ma',
  senegal: 'sn',
  tunisia: 'tn',
  tunus: 'tn',
  algeria: 'dz',
  cezayir: 'dz',
  egypt: 'eg',
  misir: 'eg',
  nigeria: 'ng',
  nijerya: 'ng',
  ghana: 'gh',
  cameroon: 'cm',
  kamerun: 'cm',
  'ivory coast': 'ci',
  'cote divoire': 'ci',
  'fildisi sahili': 'ci',
  'south africa': 'za',
  'guney afrika': 'za',
  mali: 'ml',
  'burkina faso': 'bf',
  'cape verde': 'cv',
  'cabo verde': 'cv',
  'dr congo': 'cd',
  'congo dr': 'cd',
  angola: 'ao',
  'equatorial guinea': 'gq',
  // — Asia / Oceania —
  japan: 'jp',
  japonya: 'jp',
  'south korea': 'kr',
  'korea republic': 'kr',
  'guney kore': 'kr',
  'north korea': 'kp',
  'korea dpr': 'kp',
  iran: 'ir',
  'ir iran': 'ir',
  'saudi arabia': 'sa',
  'suudi arabistan': 'sa',
  qatar: 'qa',
  katar: 'qa',
  australia: 'au',
  avustralya: 'au',
  'china pr': 'cn',
  china: 'cn',
  cin: 'cn',
  iraq: 'iq',
  irak: 'iq',
  'united arab emirates': 'ae',
  uzbekistan: 'uz',
  jordan: 'jo',
  urdun: 'jo',
  'new zealand': 'nz',
  india: 'in',
  hindistan: 'in',
  indonesia: 'id',
  endonezya: 'id',
  thailand: 'th',
  vietnam: 'vn',
}

/** ISO code for a country/team name, or null when it isn't a known country. */
export function countryCode(name: string | undefined | null): string | null {
  if (!name) return null
  return ISO2[norm(name)] ?? null
}

/** Flag image URL for a country/team name, or null when not a known country. */
export function flagUrl(name: string | undefined | null): string | null {
  const code = countryCode(name)
  return code ? `https://flagcdn.com/h60/${code}.png` : null
}

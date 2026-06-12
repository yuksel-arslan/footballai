// Reference data - static league and country information
// Used for league selection, country flags, and type definitions

// League reference type (extended with country info)
export interface LeagueRef {
  id: number
  /** Provider (API-Football) league id — the id space the backend/DB uses */
  apiId: number
  name: string
  country: string
  logoUrl?: string
  countryCode: string
  language: string
}

// Leagues with country info
export const LEAGUES: Record<string, LeagueRef> = {
  PL: {
    id: 1,
    apiId: 39,
    name: 'Premier League',
    country: 'England',
    countryCode: 'GB',
    language: 'en',
    logoUrl: 'https://crests.football-data.org/PL.png',
  },
  PD: {
    id: 2,
    apiId: 140,
    name: 'La Liga',
    country: 'Spain',
    countryCode: 'ES',
    language: 'es',
    logoUrl: 'https://crests.football-data.org/PD.png',
  },
  BL1: {
    id: 3,
    apiId: 78,
    name: 'Bundesliga',
    country: 'Germany',
    countryCode: 'DE',
    language: 'de',
    logoUrl: 'https://crests.football-data.org/BL1.png',
  },
  SA: {
    id: 4,
    apiId: 135,
    name: 'Serie A',
    country: 'Italy',
    countryCode: 'IT',
    language: 'it',
    logoUrl: 'https://crests.football-data.org/SA.png',
  },
  FL1: {
    id: 5,
    apiId: 61,
    name: 'Ligue 1',
    country: 'France',
    countryCode: 'FR',
    language: 'fr',
    logoUrl: 'https://crests.football-data.org/FL1.png',
  },
  TSL: {
    id: 6,
    apiId: 203,
    name: 'Süper Lig',
    country: 'Türkiye',
    countryCode: 'TR',
    language: 'tr',
    logoUrl:
      'https://upload.wikimedia.org/wikipedia/tr/7/7f/S%C3%BCper_Lig_logo.png',
  },
  PPL: {
    id: 7,
    apiId: 94,
    name: 'Primeira Liga',
    country: 'Portugal',
    countryCode: 'PT',
    language: 'pt',
    logoUrl: 'https://crests.football-data.org/PPL.png',
  },
  DED: {
    id: 8,
    apiId: 88,
    name: 'Eredivisie',
    country: 'Netherlands',
    countryCode: 'NL',
    language: 'nl',
    logoUrl: 'https://crests.football-data.org/DED.png',
  },
  CL: {
    id: 9,
    apiId: 2,
    name: 'Champions League',
    country: 'Europe',
    countryCode: 'EU',
    language: 'en',
    logoUrl: 'https://crests.football-data.org/CL.png',
  },
  EL: {
    id: 10,
    apiId: 3,
    name: 'Europa League',
    country: 'Europe',
    countryCode: 'EU',
    language: 'en',
    logoUrl: 'https://crests.football-data.org/EL.png',
  },
  WC: {
    id: 11,
    apiId: 1,
    name: 'Dünya Kupası',
    country: 'Dünya',
    countryCode: 'INT',
    language: 'en',
    logoUrl: 'https://media.api-sports.io/football/leagues/1.png',
  },
}

// Lowercased league-name aliases per code, to match fixtures coming from
// different providers (Football-Data.org vs API-Football use different names).
export const LEAGUE_ALIASES: Record<string, string[]> = {
  PL: ['premier league'],
  PD: ['la liga', 'laliga', 'primera division', 'primera división'],
  BL1: ['bundesliga'],
  SA: ['serie a'],
  FL1: ['ligue 1'],
  TSL: ['süper lig', 'super lig'],
  PPL: ['primeira liga', 'liga portugal'],
  DED: ['eredivisie'],
  CL: ['uefa champions league', 'champions league'],
  EL: ['uefa europa league', 'europa league'],
  WC: ['fifa world cup', 'world cup', 'dünya kupası'],
}

// Country flags (emoji)
export const COUNTRY_FLAGS: Record<string, string> = {
  GB: '🇬🇧',
  ES: '🇪🇸',
  DE: '🇩🇪',
  IT: '🇮🇹',
  FR: '🇫🇷',
  TR: '🇹🇷',
  PT: '🇵🇹',
  NL: '🇳🇱',
  EU: '🇪🇺',
  INT: '🌍',
}

// Standing type definition
export interface Standing {
  /** Group label for tournament standings (e.g. "Group A"); absent for leagues */
  group?: string
  position: number
  team: {
    id: number
    name: string
    logoUrl?: string
    code?: string
  }
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  form: ('W' | 'D' | 'L')[]
}

// Get all leagues as array
export function getAllLeagues() {
  return Object.values(LEAGUES)
}

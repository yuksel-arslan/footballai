# FootballAI Web App

Next.js 15 frontend for FootballAI. AI-powered football predictions, live scores, standings, and match analysis.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 3.4
- **State:** Zustand 5
- **Data Fetching:** TanStack Query 5
- **UI:** Custom components (shadcn/ui inspired)
- **Fonts:** Geist Sans & Geist Mono
- **Icons:** Lucide React
- **Auth:** JWT + Google OAuth + 2FA (TOTP)
- **AI:** Google Gemini integration
- **i18n:** TR/EN/DE/ES/IT/FR
- **PWA:** Service Worker + Web Manifest

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home - hero, live scores, predictions, standings |
| `/matches` | All matches with filters |
| `/predictions` | AI predictions for upcoming matches |
| `/standings` | League tables |
| `/favorites` | User's favorite teams/leagues |
| `/league/[code]` | League detail page |
| `/admin` | Admin dashboard |
| `/login` | Login page |
| `/register` | Registration page |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset form |
| `/two-factor` | 2FA verification |
| `/offline` | Offline fallback page |

## Components

```
src/components/
├── home/          quick-stats.tsx
├── layout/        header.tsx, sidebar.tsx, layout-wrapper.tsx
├── matches/       live-scores.tsx, match-card.tsx, match-list.tsx
├── prediction/    AIHighlights.tsx, MatchPrediction.tsx
├── pwa/           service-worker-register.tsx
├── standings/     league-table.tsx
└── ui/            animated-logo.tsx, gradient-title.tsx, theme-toggle.tsx
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FOOTBALL_DATA_KEY` | No | Football-Data.org API key |
| `API_FOOTBALL_KEY` | No | API-Football key |
| `GEMINI_API_KEY` | No | Google Gemini for AI |
| `NEXT_PUBLIC_APP_URL` | No | App URL (default: footballai.io) |
| `NEXT_PUBLIC_USE_MOCK` | No | Use mock data (default: false) |

## Setup

```bash
# From repo root
pnpm install

# Start dev server (port 3000)
pnpm --filter web dev

# Build for production
pnpm --filter web build

# Start production server
pnpm --filter web start
```

## Features

- Dark/light mode with system preference detection
- Responsive design (mobile-first)
- Glassmorphism + neon glow UI theme
- Layout toggle: sidebar or header navigation
- Multi-language support (6 languages)
- PWA with offline support
- API proxy routes to backend services

## Architecture

```
src/
├── app/                # Next.js App Router
│   ├── (auth)/         # Auth pages (login, register, etc.)
│   ├── api/            # API routes (proxy to services)
│   ├── admin/          # Admin pages
│   └── [pages]/        # Content pages
├── components/         # React components
├── hooks/              # Custom hooks (useFixtures, useAuth, usePrediction)
├── lib/                # Utilities, API client, auth, i18n
│   ├── auth/           # JWT, security, 2FA
│   ├── i18n/           # Translations & context
│   ├── api.ts          # API client
│   ├── api-client.ts   # HTTP wrapper
│   ├── gemini.ts       # AI integration
│   └── mock-data.ts    # Fallback data
├── stores/             # Zustand stores
└── types/              # TypeScript types
```

## Status

- [x] All pages implemented
- [x] Dark/light mode
- [x] i18n (6 languages)
- [x] Auth system (register, login, 2FA, Google OAuth)
- [x] PWA manifest + service worker
- [x] Geist font system
- [ ] Real API integration (currently uses mock data)
- [ ] WebSocket live score updates
- [ ] Push notifications

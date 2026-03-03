# FootballAI Web App

Next.js 16 frontend for FootballAI. AI-powered football predictions, live scores, standings, and match analysis with a glassmorphism UI.

## Tech Stack

- **Framework:** Next.js 16.1 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 3.4, tailwindcss-animate
- **State Management:** Zustand 5
- **Data Fetching:** TanStack React Query 5
- **UI Components:** Custom (shadcn/ui inspired), Lucide React icons
- **Fonts:** Geist Sans & Geist Mono
- **Charts:** Recharts 2
- **Animations:** Framer Motion 11
- **Auth:** JWT + Google OAuth + 2FA (TOTP)
- **AI:** Google Gemini integration
- **Real-time:** socket.io-client (dynamic import)
- **PWA:** Service Worker + Web Manifest
- **i18n:** TR/EN/DE/ES/IT/FR

## Pages

| Route              | Description                                      |
| ------------------ | ------------------------------------------------ |
| `/`                | Home - hero, live scores, predictions, standings |
| `/matches`         | All matches with filters                         |
| `/predictions`     | AI predictions for upcoming matches              |
| `/standings`       | League tables                                    |
| `/favorites`       | User's favorite teams/leagues (auth required)    |
| `/league/[code]`   | League detail page                               |
| `/admin`           | Admin dashboard                                  |
| `/login`           | Login page                                       |
| `/register`        | Registration page                                |
| `/forgot-password` | Password reset request                           |
| `/reset-password`  | Password reset form                              |
| `/two-factor`      | 2FA verification                                 |
| `/offline`         | Offline fallback page                            |

## API Routes (Next.js Proxy)

| Method | Path                           | Proxies To         |
| ------ | ------------------------------ | ------------------ |
| ALL    | `/api/football`                | Football data APIs |
| POST   | `/api/auth/login`              | user-service       |
| POST   | `/api/auth/register`           | user-service       |
| GET    | `/api/auth/me`                 | user-service       |
| POST   | `/api/auth/logout`             | user-service       |
| POST   | `/api/auth/2fa/*`              | user-service       |
| GET    | `/api/auth/google`             | user-service       |
| POST   | `/api/predict`                 | Gemini AI direct   |
| GET    | `/api/predictions/[fixtureId]` | match-service      |
| POST   | `/api/predictions/ml`          | match-service      |
| GET    | `/api/predictions/model`       | match-service      |

## Environment Variables

| Variable                         | Required | Default               | Description                       |
| -------------------------------- | -------- | --------------------- | --------------------------------- |
| `NEXT_PUBLIC_API_URL`            | No       | http://localhost:3000 | API gateway URL                   |
| `NEXT_PUBLIC_DATA_SOURCE`        | No       | proxy                 | Data source: `proxy` or `gateway` |
| `FOOTBALL_DATA_KEY`              | No       | -                     | Football-Data.org API key         |
| `API_FOOTBALL_KEY`               | No       | -                     | API-Football key                  |
| `GEMINI_API_KEY`                 | No       | -                     | Google Gemini API key             |
| `JWT_SECRET`                     | No       | -                     | JWT secret for auth               |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`   | No       | -                     | Google OAuth client ID            |
| `NEXT_PUBLIC_WS_URL`             | No       | API_URL               | WebSocket server URL              |
| `NEXT_PUBLIC_SITE_URL`           | No       | https://footballai.io | Site URL                          |
| `NEXT_PUBLIC_ENABLE_WS`          | No       | true                  | Enable WebSocket                  |
| `NEXT_PUBLIC_ENABLE_PREDICTIONS` | No       | true                  | Enable predictions                |
| `NEXT_PUBLIC_ENABLE_AUTH`        | No       | true                  | Enable auth features              |
| `ML_SERVICE_URL`                 | No       | http://localhost:8000 | ML service URL                    |

## Project Structure

```
apps/web/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API route handlers (proxy)
│   │   │   ├── auth/                 # Auth proxy routes
│   │   │   ├── football/             # Football data proxy
│   │   │   ├── predict/              # AI prediction proxy
│   │   │   └── predictions/          # ML prediction proxy
│   │   ├── admin/                    # Admin pages
│   │   ├── matches/                  # Matches page
│   │   ├── league/[code]/            # League detail page
│   │   ├── page.tsx                  # Home page
│   │   ├── loading.tsx               # Loading state
│   │   └── error.tsx                 # Error boundary
│   ├── components/
│   │   ├── home/                     # quick-stats
│   │   ├── layout/                   # header, sidebar, layout-wrapper
│   │   ├── matches/                  # live-scores, match-card, match-list
│   │   ├── prediction/               # AIHighlights, MatchPrediction
│   │   ├── pwa/                      # service-worker-register, offline-banner
│   │   ├── standings/                # league-table
│   │   └── ui/                       # badge, card, skeleton, theme-toggle, etc.
│   ├── hooks/
│   │   ├── use-websocket.ts          # WebSocket hook (dynamic import)
│   │   ├── use-fixtures.ts           # Fixture data hook
│   │   ├── use-prediction.ts         # Prediction hook
│   │   ├── use-live-scores.ts        # Live scores hook
│   │   ├── use-online-status.ts      # Online status hook
│   │   └── useAuth.ts               # Auth hook
│   ├── lib/
│   │   ├── auth/                     # JWT, security, 2FA utils
│   │   ├── i18n/                     # Translations & context (6 langs)
│   │   ├── api.ts                    # API client
│   │   ├── api-client.ts            # HTTP wrapper with retry
│   │   ├── env.ts                   # Environment config
│   │   ├── gemini.ts                # AI integration
│   │   └── mock-data.ts             # Fallback data
│   ├── stores/
│   │   ├── auth.store.ts            # Zustand auth store
│   │   └── prediction.store.ts      # Zustand prediction store
│   └── types/
│       └── index.ts                 # TypeScript type definitions
├── public/                           # Static assets, PWA manifest
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── postcss.config.js
```

## Local Development

```bash
# Install dependencies (from repo root)
pnpm install

# Start dev server (port 3100 default)
pnpm --filter web dev

# Type check
pnpm --filter web typecheck

# Build for production
pnpm --filter web build

# Start production server
pnpm --filter web start

# Lint
pnpm --filter web lint
```

## Deployment

- **Platform:** Vercel
- **Build:** `prisma generate && next build`
- **Config:** `vercel.json` in repo root
- **Framework:** Next.js (auto-detected by Vercel)

## Features

- Dark/light mode with system preference detection
- Responsive design (mobile-first)
- Glassmorphism + neon glow UI theme
- Layout toggle: sidebar or header navigation
- Multi-language support (6 languages)
- PWA with offline support
- API proxy routes to backend services
- Real-time live scores via WebSocket

## Dependencies (Other Services)

| Service                   | Relationship      | Description                                    |
| ------------------------- | ----------------- | ---------------------------------------------- |
| **@football-ai/database** | Workspace package | Prisma client for server-side queries          |
| **api-gateway**           | API proxy target  | Primary backend endpoint                       |
| **match-service**         | Direct proxy      | Predictions, fixtures (via Next.js API routes) |
| **user-service**          | Direct proxy      | Auth, profile (via Next.js API routes)         |
| **Google Gemini**         | External API      | AI prediction generation                       |
| **Football-Data.org**     | External API      | Football data (via proxy route)                |

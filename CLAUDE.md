# FootballAI - Claude Code Instructions

## Project Overview

AI-powered football match prediction platform. Monorepo with Next.js 16 frontend and Node.js/Python microservices backend.

**Tech Stack:**

- Frontend: Next.js 16.1.4 (App Router), React 19, TypeScript, Tailwind CSS 3.4
- Backend: Node.js 22 (Express), Python 3.11 (FastAPI)
- Database: PostgreSQL (Neon), 16 Prisma models, shared schema
- Cache: Redis (Upstash)
- ML: Poisson (40%) + XGBoost (60%) ensemble, 21-feature pipeline
- Deployment: Vercel (web), Railway/Railpack (services)
- Package Manager: pnpm (workspaces)
- Build: Turborepo

## Architecture

```
football-ai/
├── apps/web/              # Next.js 16 frontend (Vercel)
├── services/
│   ├── api-gateway/       # Port 3000 - Route proxy, rate limiting
│   ├── match-service/     # Port 3001 - Fixtures, teams, leagues, predictions proxy
│   ├── stats-service/     # Port 3002 - Team stats, standings, H2H
│   ├── user-service/      # Port 3003 - Auth, profile, favorites, notifications
│   └── ml-service/        # Port 8000 - Python ML predictions (FastAPI)
├── packages/
│   ├── database/          # Shared Prisma schema + client
│   └── typescript-config/ # Shared tsconfig
```

## Service Ports

| Service       | Port | Description                             |
| ------------- | ---- | --------------------------------------- |
| API Gateway   | 3000 | Reverse proxy, routes to all services   |
| match-service | 3001 | Fixtures, teams, leagues, WebSocket     |
| stats-service | 3002 | Team stats, standings, H2H comparison   |
| user-service  | 3003 | Auth, profile, favorites, notifications |
| ml-service    | 8000 | ML predictions (FastAPI/Python)         |
| Next.js (dev) | 3000 | Frontend dev server (default Next.js)   |

## API Gateway Routing

```
/api/fixtures/*    -> match-service:3001
/api/teams/*       -> match-service:3001
/api/leagues/*     -> match-service:3001
/api/stats/*       -> stats-service:3002
/api/auth/*          -> user-service:3003
/api/profile/*       -> user-service:3003 (includes /api/profile/favorites/*)
/api/notifications/* -> user-service:3003
/api/predictions/*   -> match-service:3001 (ML proxy + AI predictions)
```

## Database Schema (16 Models)

League, Team, Fixture, LiveScore, Prediction, TeamStats, H2HRecord, User, LoginAuditLog, TokenBlacklist, FavoriteTeam, FavoriteLeague, UserPrediction, Notification, Standing, ModelMetrics

Schema location: `packages/database/prisma/schema.prisma`

## Key API Endpoints

### Auth (user-service `/api/auth/`)

- `POST /register` - body: `{ email, password, name }` (stored as `fullName` in DB)
- `POST /login` - body: `{ email, password }`
- `POST /forgot-password`
- `POST /reset-password`
- `POST /verify-email`
- `POST /logout` (auth required)
- `GET /me` (auth required)
- `POST /2fa/setup`, `/2fa/verify`, `/2fa/enable`, `/2fa/disable`
- `GET /google`, `/google/callback`

### Profile (user-service `/api/profile/`)

- `GET /` - Get profile (auth required)
- `PUT /` - Update profile (auth required)
- `GET /favorites/teams` / `POST /favorites/teams/:id` / `DELETE /favorites/teams/:id`
- `GET /favorites/leagues` / `POST /favorites/leagues/:id` / `DELETE /favorites/leagues/:id`

### Stats (stats-service `/api/stats/`)

- `GET /teams/:id` - Team statistics
- `GET /teams/:id/form` - Recent form (last 5)
- `GET /compare?team1=X&team2=Y` - Team comparison
- `GET /leagues/:id/standings` - League standings
- `GET /h2h/:team1/:team2` - Head-to-head record

### ML Predictions (ml-service `/api/predictions/`)

- `POST /predict` - Single match prediction
- `POST /predict/batch` - Batch predictions
- `GET /model/info` - Model info
- `GET /performance` - Model performance metrics
- `POST /train` - Train model
- `POST /train/auto` - Auto-train

## JWT Configuration

- Algorithm: HS256 (shared secret via `JWT_SECRET`)
- Access token expiry: `JWT_EXPIRES_IN` (default: `7d`)
- Refresh token expiry: `30d`
- `JWT_SECRET` must be at least 32 characters

## Rate Limiting (API Gateway)

- General: 100 requests / 15 min
- Auth endpoints: 20 requests / 15 min

## ML Model Details

- Ensemble: Poisson (40% weight) + XGBoost (60% weight)
- 21 features extracted from team stats and H2H data
- Features include: form scores, attack/defense strength, goals per game, clean sheet rate, league position diff, H2H rates, win rates
- Falls back to Poisson-only when XGBoost is not trained

## Environment Setup

```bash
cp .env.example .env
```

Key environment variables:

- `DATABASE_URL` - Neon PostgreSQL connection string
- `REDIS_URL` - Upstash Redis URL
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `NEXT_PUBLIC_API_URL` - API Gateway URL (default: `http://localhost:3000`)
- `FOOTBALL_DATA_KEY` - Football-Data.org API key
- `API_FOOTBALL_KEY` - API-Football key (optional)
- `GEMINI_API_KEY` - Google Gemini for AI predictions
- `ANTHROPIC_API_KEY` - Anthropic Claude for AI predictions (optional second provider)
- `AI_MODEL_RESEARCH` / `AI_MODEL_ANALYSIS` / `AI_MODEL_PREDICTION` - Optional per-task model overrides; by default the best configured model is auto-selected per task (research=fast/cheap, analysis=strongest reasoning, prediction=accuracy first; see `apps/web/src/lib/ai-config.ts`)
- `NEXT_PUBLIC_USE_MOCK` - Set `"true"` for dev without API keys

## Development Commands

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Start all services via Turborepo
pnpm dev:web              # Start only Next.js frontend
pnpm dev:services         # Start only Node.js services
pnpm dev:ml               # Start only ML service
pnpm dev:full             # Start everything (web + services + ML) concurrently
pnpm build                # Build all
pnpm test                 # Run all tests
pnpm lint                 # Lint all
pnpm typecheck            # TypeScript type checking
pnpm db:generate          # Generate Prisma client
pnpm db:push              # Push schema to database
pnpm db:migrate           # Run Prisma migrations
pnpm db:studio            # Open Prisma Studio
pnpm db:seed              # Seed database
```

## Frontend Pages (16 routes)

```
/                          # Home - match listings
/(auth)/login              # Login
/(auth)/register           # Register
/(auth)/forgot-password    # Forgot password
/(auth)/reset-password     # Reset password
/(auth)/two-factor         # 2FA verification
/matches                   # All matches
/matches/[id]              # Match detail
/standings                 # League standings
/league/[code]             # League detail
/teams/[id]                # Team detail
/predictions               # AI predictions
/favorites                 # Favorite teams/leagues
/profile                   # User profile
/admin                     # Admin panel
/offline                   # Offline fallback (PWA)
```

## Frontend Structure

```
apps/web/src/
├── app/              # Next.js App Router pages + API routes
│   ├── (auth)/       # Auth route group
│   ├── api/          # API proxy routes
│   └── ...           # Page routes
├── components/       # React components
│   ├── home/
│   ├── layout/
│   ├── matches/
│   ├── prediction/
│   ├── pwa/
│   ├── standings/
│   └── ui/
├── hooks/            # Custom React hooks
├── lib/              # Utilities, auth, i18n
├── stores/           # Zustand state stores
└── types/            # TypeScript type definitions
```

## Code Conventions

- All services use Pino for structured logging
- Express services follow: routes -> controllers -> services pattern
- All async route handlers wrapped with `asyncHandler`
- Prisma client imported from `@football-ai/database`
- API routes are unversioned (e.g., `/api/auth/register`, not `/api/v1/auth/register`)
- Next.js 16 params are Promises: `const { id } = await params`
- Railway builder: RAILPACK (not Nixpacks)

## Deployment

- **Frontend**: Vercel (auto-deploy from main branch)
- **Backend Services**: Railway (Railpack builder)
- **Database**: Neon PostgreSQL (shared across all services)
- **Cache**: Upstash Redis

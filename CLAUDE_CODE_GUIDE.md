# FootballAI - Claude Code Development Guide

**Last Updated:** February 24, 2026
**Status:** Phase 2 - Microservices Architecture Complete

## Project Status

### Completed
- **Monorepo:** Turborepo + pnpm workspaces
- **Database:** 15 Prisma models (PostgreSQL on Neon)
- **Frontend:** Next.js 15 + App Router, Tailwind CSS, dark/light mode, i18n (6 languages), PWA
- **Match Service** (Port 3001): Fixtures, teams, leagues, auth, stats, predictions
- **Stats Service** (Port 3002): Team stats, standings, H2H, team comparison
- **User Service** (Port 3003): Auth (register/login/JWT), profile, favorites
- **API Gateway** (Port 3000): Central routing, rate limiting, health aggregation
- **ML Service** (Port 8000): FastAPI + Poisson model, prediction endpoints
- **Auth System:** Register, Login, JWT, 2FA, Google OAuth, Email Verification
- **AI:** Google Gemini for predictions
- **Font System:** Geist Sans + Geist Mono
- **API Integration:** Real API with mock data fallback

### Pending
- WebSocket live score updates
- XGBoost/LSTM/Ensemble ML models
- Push notifications
- Test coverage

---

## Architecture

```
footballai/
├── apps/web/                    # Next.js 15 frontend (Port 3100)
├── packages/
│   ├── database/                # Prisma schema + client
│   └── typescript-config/       # Shared TS configs
└── services/
    ├── api-gateway/             # Port 3000 - Request routing
    ├── match-service/           # Port 3001 - Football data
    ├── stats-service/           # Port 3002 - Statistics
    ├── user-service/            # Port 3003 - Auth & profiles
    └── ml-service/              # Port 8000 - ML predictions
```

## API Routing (via Gateway)

```
/api/fixtures/*    → match-service:3001
/api/teams/*       → match-service:3001
/api/leagues/*     → match-service:3001
/api/stats/*       → stats-service:3002
/api/auth/*        → user-service:3003
/api/profile/*     → user-service:3003
/api/predictions/* → ml-service:8000
/health            → aggregated health check
```

## Quick Start

```bash
git clone https://github.com/yuksel-arslan/footballai.git
cd footballai
pnpm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your keys

# Start all services
pnpm dev
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Zustand, TanStack Query |
| Backend | Node.js 22, Express.js, Prisma ORM |
| ML | Python 3.11, FastAPI, scikit-learn, XGBoost |
| Database | PostgreSQL (Neon), Redis (Upstash) |
| AI | Google Gemini |
| Auth | JWT, bcryptjs, Google OAuth, 2FA (TOTP) |
| Deploy | Vercel (frontend), Railway (backend) |

## Environment Variables

See `.env.example` for all variables. Key ones:

```
DATABASE_URL          # PostgreSQL (required)
JWT_SECRET            # Auth signing (required, min 32 chars)
FOOTBALL_DATA_KEY     # Football-Data.org API
API_FOOTBALL_KEY      # API-Football API
GEMINI_API_KEY        # Google Gemini AI
NEXT_PUBLIC_API_URL   # API Gateway URL (default: http://localhost:3000)
NEXT_PUBLIC_USE_MOCK  # Force mock data (default: false)
```

## Service README Files

Each service has its own README.md with endpoints, setup, and architecture:
- `services/match-service/README.md`
- `services/stats-service/README.md`
- `services/user-service/README.md`
- `services/api-gateway/README.md`
- `services/ml-service/README.md`
- `apps/web/README.md`

## Database Schema (15 Models)

Key models: League, Team, Fixture, Prediction, User, TeamStats, H2HRecord, LiveScore, Notification, ModelMetrics, LoginAuditLog, TokenBlacklist, FavoriteTeam, FavoriteLeague, UserPrediction

Schema location: `packages/database/prisma/schema.prisma`

## Next Steps

1. **ML Enhancement:** XGBoost model, feature engineering, training pipeline
2. **Real-time:** WebSocket for live score updates
3. **Notifications:** Push notifications via Web Push API
4. **Testing:** Unit tests for all services
5. **PWA:** Offline improvements, background sync

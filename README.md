# FootballAI — AI-Powered Football Prediction Platform

> Full-stack AI football match prediction platform with Poisson + XGBoost ensemble ML models, real-time WebSocket scores, secure authentication, and a modern Next.js 16 frontend.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma)](https://www.prisma.io/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js)](https://nodejs.org/)

## Architecture

```
                          ┌───────────────────────────────┐
                          │     Vercel (Frontend)         │
                          │     Next.js 16 App Router     │
                          │     16 pages + PWA + i18n     │
                          └──────────────┬────────────────┘
                                         │ HTTPS
                          ┌──────────────▼────────────────┐
                          │     API Gateway (Port 3000)   │
                          │     Express + Rate Limiting   │
                          │     Swagger Docs at /docs     │
                          └──┬──────────┬─────────┬───────┘
                             │          │         │
              ┌──────────────▼──┐ ┌─────▼─────┐ ┌─▼────────────────┐
              │ Match Service   │ │ Stats     │ │ User Service     │
              │ Port 3001       │ │ Service   │ │ Port 3003        │
              │ Fixtures, Teams │ │ Port 3002 │ │ Auth, Profiles   │
              │ Leagues, WS     │ │ Standings │ │ 2FA, OAuth       │
              │ AI Predictions  │ │ H2H, Form │ │ Favorites        │
              └──────┬──────────┘ └─────┬─────┘ └──────┬───────────┘
                     │                  │              │
              ┌──────▼──────────────────▼──────────────▼───────┐
              │            PostgreSQL (Neon) — 16 models       │
              │            Redis (Upstash) — caching           │
              └────────────────────────────────────────────────┘
                     │
              ┌──────▼──────────┐
              │ ML Service      │
              │ Port 8000       │
              │ FastAPI + Python│
              │ Poisson+XGBoost │
              └─────────────────┘
```

## Tech Stack

| Layer          | Technology                                                              |
| -------------- | ----------------------------------------------------------------------- |
| Frontend       | Next.js 16, React 19, TypeScript 5.7, Tailwind CSS 3.4, Framer Motion   |
| State          | Zustand, React Query, Socket.io-client                                  |
| Backend        | Node.js 22, Express.js, Prisma ORM, Redis (ioredis), Pino logger        |
| ML             | Python 3.11, FastAPI, scikit-learn, XGBoost, Poisson regression         |
| Auth           | JWT, 2FA (TOTP/speakeasy), Google OAuth, bcrypt, account lockout        |
| Database       | PostgreSQL (Neon), 16 Prisma models                                     |
| Infrastructure | pnpm workspaces, Turborepo, GitHub Actions, ESLint 9, Husky, commitlint |
| Deployment     | Vercel (frontend), Railway (services), Neon (DB), Upstash (Redis)       |

## Pages (16)

| Page            | Route              | Description                              |
| --------------- | ------------------ | ---------------------------------------- |
| Home            | `/`                | Dashboard with live scores & predictions |
| Login           | `/login`           | Email/password + Google OAuth            |
| Register        | `/register`        | Account registration                     |
| Forgot Password | `/forgot-password` | Password reset request                   |
| Reset Password  | `/reset-password`  | Password reset with token                |
| Two-Factor      | `/two-factor`      | 2FA verification                         |
| Matches         | `/matches`         | All fixtures (upcoming/live/finished)    |
| Match Detail    | `/matches/[id]`    | Match details + AI prediction            |
| Predictions     | `/predictions`     | AI predictions dashboard                 |
| Standings       | `/standings`       | League standings tables                  |
| Teams           | `/teams`           | Team search and listing                  |
| Team Detail     | `/teams/[id]`      | Team statistics and fixtures             |
| League          | `/league/[code]`   | League-specific view                     |
| Profile         | `/profile`         | User profile management                  |
| Favorites       | `/favorites`       | Favorite teams and leagues               |
| Admin           | `/admin`           | Admin dashboard                          |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/yuksel-arslan/footballai.git
cd footballai

# 2. Install dependencies
pnpm install

# 3. Environment setup
cp .env.example .env.local
# Edit .env.local with: DATABASE_URL, JWT_SECRET, REDIS_URL, API keys

# 4. Database setup
pnpm db:generate
pnpm db:push
pnpm db:seed

# 5. Start development
pnpm dev:full    # All services + web + ML
```

## Scripts

| Command             | Description                            |
| ------------------- | -------------------------------------- |
| `pnpm dev:full`     | Start everything (web + services + ML) |
| `pnpm dev:web`      | Start Next.js frontend only            |
| `pnpm dev:services` | Start all Node.js backend services     |
| `pnpm dev:ml`       | Start Python ML service only           |
| `pnpm build`        | Build all packages                     |
| `pnpm typecheck`    | TypeScript type checking               |
| `pnpm lint`         | ESLint across monorepo                 |
| `pnpm test`         | Run all tests (Vitest)                 |
| `pnpm db:generate`  | Generate Prisma client                 |
| `pnpm db:push`      | Push schema to database                |
| `pnpm db:seed`      | Seed database with demo data           |
| `pnpm db:studio`    | Open Prisma Studio                     |

## Deployment

| Component     | Platform | URL / Notes      |
| ------------- | -------- | ---------------- |
| Web Frontend  | Vercel   | footballai.io    |
| Node Services | Railway  | Railpack builder |
| ML Service    | Railway  | Docker container |
| Database      | Neon     | PostgreSQL       |
| Cache         | Upstash  | Redis            |

See [Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md) and [Railway Guide](docs/RAILWAY_DEPLOYMENT.md) for details.

## API Documentation

Every service exposes interactive Swagger docs at `/docs`:

| Service       | Docs URL                    |
| ------------- | --------------------------- |
| API Gateway   | http://localhost:3000/docs  |
| Match Service | http://localhost:3001/docs  |
| Stats Service | http://localhost:3002/docs  |
| User Service  | http://localhost:3003/docs  |
| ML Service    | http://localhost:8000/docs  |
| ML Service    | http://localhost:8000/redoc |

## Project Structure

```
footballai/
├── apps/
│   └── web/                    # Next.js 16 frontend
│       └── src/
│           ├── app/            # App Router (16 pages + 33 API routes)
│           ├── components/     # 22 React components
│           ├── hooks/          # 11 custom hooks
│           ├── lib/            # Utilities, auth, i18n (6 languages)
│           ├── stores/         # Zustand state management
│           └── middleware.ts   # Auth route protection
├── packages/
│   ├── database/               # Prisma schema (16 models) + seed
│   └── typescript-config/      # Shared TypeScript configs
├── services/
│   ├── api-gateway/            # Central router + rate limiting
│   ├── match-service/          # Fixtures, teams, leagues, WebSocket, predictions
│   ├── stats-service/          # Statistics, standings, H2H, form analysis
│   ├── user-service/           # Auth, profiles, favorites, notifications
│   └── ml-service/             # Python ML prediction engine
├── docs/                       # Deployment guides + checklist
├── .github/workflows/          # CI/CD pipelines
├── turbo.json                  # Turborepo config
└── pnpm-workspace.yaml         # Workspace definition
```

## Health Checks

All services expose `/health` endpoints:

```bash
curl http://localhost:3000/health  # API Gateway (aggregates all services)
curl http://localhost:3001/health  # Match Service
curl http://localhost:3002/health  # Stats Service
curl http://localhost:3003/health  # User Service
curl http://localhost:8000/health  # ML Service
```

## Documentation

- [Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md)
- [Railway Deployment Guide](docs/RAILWAY_DEPLOYMENT.md)
- [Services Overview](SERVICES.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Technical Specification](FOOTBALL_PREDICTION_TECHNICAL_SPEC.md)

## License

Private - All rights reserved.

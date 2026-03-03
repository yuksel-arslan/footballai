# FootballAI - AI-Powered Football Match Predictions

> AI-powered football match predictions platform built with Next.js 15, Express.js microservices, Poisson + XGBoost ensemble ML model, and WebSocket live score support.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma)](https://www.prisma.io/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js)](https://nodejs.org/)

## Features

- **AI Predictions** - Poisson + XGBoost ensemble model with confidence ratings
- **Detailed Statistics** - Team form, H2H records, league tables
- **Live Scores** - WebSocket real-time match updates
- **Modern UI** - Next.js 15 + Tailwind CSS, dark/light mode, responsive
- **Secure Auth** - JWT, 2FA (TOTP), Google OAuth, account lockout, rate limiting
- **PWA** - Installable, offline support, push notifications
- **SEO** - Per-page metadata, OG images, sitemap, robots.txt

## Architecture

### Monorepo (pnpm + Turborepo)

```
footballai/
├── apps/
│   └── web/                 # Next.js 15 frontend (Vercel)
├── packages/
│   ├── database/            # Prisma schema (15 models)
│   └── typescript-config/   # Shared TS configs
├── services/
│   ├── api-gateway/         # Express.js gateway (Port 3000)
│   ├── match-service/       # Match data + WebSocket (Port 3001)
│   ├── stats-service/       # Statistics + standings (Port 3002)
│   ├── user-service/        # Auth & profiles (Port 3003)
│   └── ml-service/          # Python ML predictions (Port 8000)
├── docs/                    # Deployment guides
└── .github/workflows/       # CI/CD pipelines
```

### Deployment

| Component     | Platform | URL                 |
| ------------- | -------- | ------------------- |
| Web Frontend  | Vercel   | footballai.io       |
| Node Services | Railway  | Internal networking |
| ML Service    | Railway  | Internal networking |
| Database      | Neon     | PostgreSQL          |
| Cache         | Upstash  | Redis               |

### Tech Stack

**Frontend:** Next.js 15, TypeScript, Tailwind CSS, Geist font, Lucide icons, socket.io-client

**Backend:** Node.js 22, Express.js, socket.io, Prisma ORM, Redis (ioredis)

**ML:** Python 3.11, FastAPI, scikit-learn, XGBoost, Poisson regression

**Infrastructure:** pnpm workspaces, Turborepo, GitHub Actions CI, ESLint 9, Husky, commitlint

## Quick Start

```bash
# Prerequisites: Node.js 22+, pnpm 9+, Python 3.11

# Clone & install
git clone https://github.com/yuksel-arslan/footballai.git
cd footballai
pnpm install

# Setup environment
cp .env.example .env.local  # Edit with your API keys

# Generate Prisma client
pnpm db:generate

# Development
pnpm dev:full    # All services + web
pnpm dev:web     # Frontend only
pnpm dev:services # Backend services only
pnpm dev:ml      # ML service only
```

## Scripts

| Command             | Description                            |
| ------------------- | -------------------------------------- |
| `pnpm dev:full`     | Start everything (web + services + ml) |
| `pnpm dev:web`      | Start Next.js frontend                 |
| `pnpm dev:services` | Start all Node.js backend services     |
| `pnpm dev:ml`       | Start Python ML service                |
| `pnpm build`        | Build all packages                     |
| `pnpm typecheck`    | TypeScript type checking               |
| `pnpm lint`         | ESLint across monorepo                 |
| `pnpm test`         | Run all tests                          |
| `pnpm db:generate`  | Generate Prisma client                 |
| `pnpm db:push`      | Push schema to database                |
| `pnpm db:studio`    | Open Prisma Studio                     |
| `pnpm clean`        | Clean all build artifacts              |

## Documentation

- [Railway Deployment Guide](docs/RAILWAY_DEPLOYMENT.md)
- [Services Overview](SERVICES.md)
- [Contributing](CONTRIBUTING.md)
- [Technical Spec](FOOTBALL_PREDICTION_TECHNICAL_SPEC.md)

## Health Checks

All services expose `/health` endpoints with status, uptime, version, and dependency checks (Redis, DB, downstream services).

```bash
# Check API Gateway (aggregates all services)
curl http://localhost:3000/health

# Individual services
curl http://localhost:3001/health  # match-service
curl http://localhost:3002/health  # stats-service
curl http://localhost:3003/health  # user-service
curl http://localhost:8000/health  # ml-service
```

## License

Private - All rights reserved.

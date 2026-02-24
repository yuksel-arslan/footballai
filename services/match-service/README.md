# Match Service

Football match data service. Integrates with multiple football data providers (Football-Data.org, API-Football, OpenLigaDB) for fixtures, teams, leagues, and predictions.

## Tech Stack

- **Runtime:** Node.js 22
- **Framework:** Express.js
- **Database:** PostgreSQL (Prisma ORM)
- **Cache:** Redis (Upstash)
- **Validation:** Zod
- **AI:** Google Gemini (predictions)
- **Port:** 3001

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/fixtures/upcoming` | Upcoming matches (query: date, league, limit) |
| GET | `/api/fixtures/live` | Live matches |
| GET | `/api/fixtures/:id` | Match details |
| POST | `/api/fixtures/sync` | Sync from football APIs |
| GET | `/api/teams/:id` | Team details |
| GET | `/api/leagues` | All leagues |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Current user (protected) |
| GET | `/api/stats/teams/:id` | Team statistics |
| GET | `/api/stats/leagues/:id/standings` | League standings |
| POST | `/api/predictions/generate` | Generate AI prediction |
| GET | `/api/predictions/:fixtureId` | Get prediction |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | No | Redis connection (caching) |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `FOOTBALL_DATA_KEY` | No | Football-Data.org API key |
| `API_FOOTBALL_KEY` | No | API-Football key |
| `GEMINI_API_KEY` | No | Google Gemini for AI predictions |
| `PORT` | No | Server port (default: 3001) |

## Setup

```bash
# From repo root
pnpm install

# Start dev server
pnpm --filter match-service dev

# Build
pnpm --filter match-service build
```

## Cache TTL

| Data | TTL |
|------|-----|
| Upcoming fixtures | 1 hour |
| Live scores | 30 seconds |
| Team info | 24 hours |
| League info | 24 hours |

## Architecture

```
src/
├── config/              # Environment & app config
├── controllers/         # Request handlers
│   ├── auth.controller.ts
│   ├── fixture-controller.ts
│   ├── prediction.controller.ts
│   └── stats.controller.ts
├── middleware/           # Express middleware
│   ├── async-handler.ts
│   ├── auth.middleware.ts
│   ├── error-handler.ts
│   └── request-logger.ts
├── routes/              # Route definitions
├── services/            # Business logic
│   ├── api-football.ts       # API-Football provider
│   ├── football-data.ts      # Football-Data.org provider
│   ├── openligadb.ts         # OpenLigaDB provider
│   ├── football-provider.ts  # Multi-provider fallback
│   ├── auth.service.ts       # JWT auth
│   ├── cache.ts              # Redis caching
│   ├── fixture-service.ts    # Fixture logic
│   ├── stats.service.ts      # Statistics
│   └── ai-prediction.service.ts # Gemini AI predictions
├── types/               # TypeScript types
└── index.ts             # Express app entry
```

## Status

- [x] Multi-provider football data integration
- [x] Redis caching layer
- [x] JWT authentication (register, login, me)
- [x] AI-powered predictions (Gemini)
- [x] Team & league statistics
- [x] Health check endpoint
- [ ] WebSocket live score updates
- [ ] Auth endpoints to be moved to user-service

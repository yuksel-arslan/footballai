# Match Service

Football match data service with WebSocket live scores. Integrates with multiple football data providers (Football-Data.org, API-Football, OpenLigaDB) for fixtures, teams, leagues, and AI-powered predictions via Google Gemini and ML service proxy.

## Tech Stack

- **Runtime:** Node.js 22
- **Framework:** Express.js 4
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL (Prisma ORM via `@football-ai/database`)
- **Cache:** Redis (Upstash, ioredis)
- **WebSocket:** socket.io 4
- **AI:** Google Gemini (`@google/generative-ai`)
- **Validation:** Zod
- **Security:** Helmet, CORS, express-rate-limit
- **Port:** 3001

## API Endpoints

### Fixtures

| Method | Path                     | Description                      |
| ------ | ------------------------ | -------------------------------- |
| GET    | `/api/fixtures/upcoming` | Upcoming matches                 |
| GET    | `/api/fixtures/live`     | Live matches                     |
| GET    | `/api/fixtures/finished` | Finished matches                 |
| GET    | `/api/fixtures/:id`      | Match details by ID              |
| POST   | `/api/fixtures/sync`     | Sync fixtures from football APIs |

```json
// GET /api/fixtures/upcoming
{
  "success": true,
  "data": [
    {
      "id": 1,
      "apiId": 12345,
      "matchDate": "2026-03-05T20:00:00Z",
      "status": "SCHEDULED",
      "homeTeam": { "id": 1, "name": "Arsenal", "logoUrl": "..." },
      "awayTeam": { "id": 2, "name": "Chelsea", "logoUrl": "..." },
      "league": { "id": 1, "name": "Premier League" }
    }
  ]
}
```

### Teams

| Method | Path                      | Description                |
| ------ | ------------------------- | -------------------------- |
| GET    | `/api/teams?q=arsenal`    | Search teams (min 2 chars) |
| GET    | `/api/teams/:id`          | Team details               |
| GET    | `/api/teams/:id/fixtures` | Team's recent fixtures     |

```json
// GET /api/teams?q=arsenal
{
  "success": true,
  "data": [{ "id": 1, "name": "Arsenal", "logoUrl": "...", "apiId": 57 }]
}
```

### Leagues

| Method | Path                           | Description                            |
| ------ | ------------------------------ | -------------------------------------- |
| GET    | `/api/leagues`                 | All leagues                            |
| GET    | `/api/leagues/:code/fixtures`  | League fixtures (with `?limit=20`)     |
| GET    | `/api/leagues/:code/standings` | League standings (with `?season=2026`) |

### Predictions

| Method | Path                          | Auth   | Description                       |
| ------ | ----------------------------- | ------ | --------------------------------- |
| GET    | `/api/predictions/model/info` | Public | ML model info                     |
| POST   | `/api/predictions/ml`         | Public | ML prediction (Poisson + XGBoost) |
| GET    | `/api/predictions/:fixtureId` | Bearer | AI prediction (Gemini)            |

```json
// POST /api/predictions/ml
// Request:
{ "fixture_id": 1, "home_team": { "team_id": 1, "name": "Arsenal", ... }, "away_team": { ... } }

// Response:
{
  "success": true,
  "data": {
    "home_win_prob": 0.55,
    "draw_prob": 0.25,
    "away_win_prob": 0.20,
    "predicted_home_score": 2.1,
    "predicted_away_score": 0.8,
    "confidence": 0.72
  },
  "source": "ml-service"
}
```

### Health

| Method | Path      | Description                                         |
| ------ | --------- | --------------------------------------------------- |
| GET    | `/health` | Health check (Redis status, WebSocket client count) |

```json
{
  "status": "ok",
  "service": "match-service",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2026-03-03T12:00:00Z",
  "websocket": { "connected": 5 },
  "checks": { "redis": "healthy" }
}
```

### WebSocket Events

Connect to `ws://localhost:3001/ws`

| Event               | Direction        | Description                     |
| ------------------- | ---------------- | ------------------------------- |
| `subscribe:live`    | Client -> Server | Subscribe to all live scores    |
| `unsubscribe:live`  | Client -> Server | Unsubscribe from live scores    |
| `subscribe:match`   | Client -> Server | Subscribe to specific match     |
| `unsubscribe:match` | Client -> Server | Unsubscribe from specific match |
| `score:update`      | Server -> Client | Live score broadcast            |
| `match:start`       | Server -> Client | Match started                   |
| `match:end`         | Server -> Client | Match ended                     |

## Environment Variables

| Variable            | Required | Default               | Description                         |
| ------------------- | -------- | --------------------- | ----------------------------------- |
| `PORT`              | No       | 3001                  | Server port                         |
| `NODE_ENV`          | No       | development           | Environment                         |
| `DATABASE_URL`      | **Yes**  | -                     | PostgreSQL connection string (Neon) |
| `REDIS_URL`         | No       | -                     | Redis connection string (Upstash)   |
| `JWT_SECRET`        | **Yes**  | -                     | JWT secret (min 32 chars)           |
| `FOOTBALL_DATA_KEY` | No       | -                     | Football-Data.org API key (primary) |
| `API_FOOTBALL_KEY`  | No       | -                     | API-Football key (fallback)         |
| `GEMINI_API_KEY`    | No       | -                     | Google Gemini API key               |
| `GEMINI_MODEL`      | No       | gemini-2.0-flash-exp  | Gemini model name                   |
| `ML_SERVICE_URL`    | No       | http://localhost:8000 | ML service URL                      |
| `JWT_EXPIRES_IN`    | No       | 7d                    | JWT expiration                      |

## Project Structure

```
services/match-service/
├── src/
│   ├── config/
│   │   └── index.ts                  # Environment config & validation
│   ├── controllers/
│   │   ├── fixture-controller.ts     # Fixture CRUD handlers
│   │   └── prediction.controller.ts  # AI/ML prediction handlers
│   ├── middleware/
│   │   ├── async-handler.ts          # Async error wrapper
│   │   ├── auth.middleware.ts        # JWT authentication
│   │   ├── error-handler.ts          # Global error handler
│   │   └── request-logger.ts         # Request logging
│   ├── routes/
│   │   ├── fixtures.ts               # /api/fixtures routes
│   │   ├── leagues.ts                # /api/leagues routes
│   │   ├── prediction.routes.ts      # /api/predictions routes
│   │   └── teams.ts                  # /api/teams routes
│   ├── services/
│   │   ├── ai-prediction.service.ts  # Gemini AI integration
│   │   ├── api-football.ts           # API-Football provider
│   │   ├── cache.ts                  # Redis cache service
│   │   ├── fixture-service.ts        # Fixture business logic
│   │   ├── football-data.ts          # Football-Data.org provider
│   │   ├── football-provider.ts      # Provider abstraction
│   │   ├── openligadb.ts             # OpenLigaDB provider (fallback)
│   │   └── websocket.ts              # socket.io setup
│   ├── types/
│   │   └── prediction.types.ts       # Prediction type definitions
│   └── index.ts                      # Express app entry point
├── package.json
├── tsconfig.json
└── railway.json
```

## Local Development

```bash
# Install dependencies (from repo root)
pnpm install

# Start dev server with hot reload
pnpm --filter match-service dev

# Type check
pnpm --filter match-service typecheck

# Build
pnpm --filter match-service build

# Run tests
pnpm --filter match-service test
```

## Deployment

- **Platform:** Railway (Railpack)
- **Build:** `tsc`
- **Start:** `node dist/index.js`
- **Config:** `railway.json` in service root
- **Health check:** `GET /health`

## Dependencies (Other Services)

| Service                   | Relationship      | Description                                 |
| ------------------------- | ----------------- | ------------------------------------------- |
| **@football-ai/database** | Workspace package | Prisma ORM client, shared schema            |
| **ml-service**            | HTTP proxy        | Forwards ML prediction requests (port 8000) |
| **api-gateway**           | Upstream proxy    | Receives proxied requests from gateway      |
| **user-service**          | Shared JWT        | Uses same JWT_SECRET for auth middleware    |

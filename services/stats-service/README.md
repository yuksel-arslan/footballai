# Stats Service

Team statistics, league standings, head-to-head records, and team comparison service with Redis caching.

## Tech Stack

- **Runtime:** Node.js 22
- **Framework:** Express.js 4
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL (Prisma ORM via `@football-ai/database`)
- **Cache:** Redis (Upstash, ioredis)
- **Validation:** Zod
- **Security:** Helmet, CORS, compression
- **Port:** 3002

## API Endpoints

### Team Statistics

| Method | Path                        | Description       |
| ------ | --------------------------- | ----------------- |
| GET    | `/api/stats/teams/:id`      | Team statistics   |
| GET    | `/api/stats/teams/:id/form` | Last 5 match form |

```json
// GET /api/stats/teams/1
{
  "success": true,
  "data": {
    "teamId": 1,
    "name": "Arsenal",
    "rank": 1,
    "wins": 20,
    "draws": 5,
    "losses": 3,
    "goalsFor": 60,
    "goalsAgainst": 22,
    "points": 65
  }
}

// GET /api/stats/teams/1/form
{
  "success": true,
  "data": {
    "teamId": 1,
    "form": "WWDWL",
    "last5": [
      { "result": "W", "score": "2-0", "opponent": "Chelsea" },
      { "result": "W", "score": "3-1", "opponent": "Brighton" }
    ]
  }
}
```

### Comparison & H2H

| Method | Path                                     | Description          |
| ------ | ---------------------------------------- | -------------------- |
| GET    | `/api/stats/compare?team1=:id&team2=:id` | Compare two teams    |
| GET    | `/api/stats/h2h/:team1/:team2`           | Head-to-head records |

```json
// GET /api/stats/h2h/1/2
{
  "success": true,
  "data": {
    "team1": { "id": 1, "name": "Arsenal", "wins": 8 },
    "team2": { "id": 2, "name": "Chelsea", "wins": 6 },
    "draws": 4,
    "totalMatches": 18
  }
}
```

### Standings

| Method | Path                               | Description                       |
| ------ | ---------------------------------- | --------------------------------- |
| GET    | `/api/stats/leagues/:id/standings` | League standings (`?season=2026`) |

```json
// GET /api/stats/leagues/1/standings?season=2026
{
  "success": true,
  "data": [],
  "leagueId": 1
}
```

### Health

| Method | Path      | Description                 |
| ------ | --------- | --------------------------- |
| GET    | `/health` | Health check (Redis status) |

```json
{
  "status": "ok",
  "service": "stats-service",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": { "redis": "healthy" }
}
```

## Environment Variables

| Variable            | Required | Default     | Description                         |
| ------------------- | -------- | ----------- | ----------------------------------- |
| `PORT`              | No       | 3002        | Server port                         |
| `NODE_ENV`          | No       | development | Environment                         |
| `DATABASE_URL`      | **Yes**  | -           | PostgreSQL connection string (Neon) |
| `REDIS_URL`         | No       | -           | Redis connection string (Upstash)   |
| `FOOTBALL_DATA_KEY` | No       | -           | Football-Data.org API key           |
| `API_FOOTBALL_KEY`  | No       | -           | API-Football key (fallback)         |

## Project Structure

```
services/stats-service/
├── src/
│   ├── config/
│   │   └── index.ts                # Environment config
│   ├── controllers/
│   │   └── stats.controller.ts     # Express request handlers
│   ├── middleware/
│   │   ├── async-handler.ts        # Async error handling
│   │   ├── error-handler.ts        # Global error handler
│   │   └── request-logger.ts       # Request logging
│   ├── routes/
│   │   └── stats.routes.ts         # API route definitions
│   ├── services/
│   │   ├── cache.ts                # Redis cache service
│   │   └── stats.service.ts        # Business logic
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces
│   └── index.ts                    # Express app entry point
├── tests/
│   └── stats.test.ts               # Unit tests
├── package.json
├── tsconfig.json
└── railway.json
```

## Local Development

```bash
# Install dependencies (from repo root)
pnpm install

# Start dev server with hot reload
pnpm --filter stats-service dev

# Type check
pnpm --filter stats-service typecheck

# Build
pnpm --filter stats-service build

# Run tests
pnpm --filter stats-service test
```

## Deployment

- **Platform:** Railway (Nixpacks)
- **Build:** `tsc`
- **Start:** `node dist/index.js`
- **Config:** `railway.json` in service root
- **Health check:** `GET /health`

## Cache TTL

| Data        | TTL        |
| ----------- | ---------- |
| Team stats  | 30 minutes |
| Team form   | 30 minutes |
| Comparison  | 30 minutes |
| Standings   | 1 hour     |
| H2H records | 2 hours    |

## Dependencies (Other Services)

| Service                   | Relationship      | Description                            |
| ------------------------- | ----------------- | -------------------------------------- |
| **@football-ai/database** | Workspace package | Prisma ORM client, shared schema       |
| **api-gateway**           | Upstream proxy    | Receives proxied requests from gateway |
| **Football-Data.org**     | External API      | Primary football data source           |
| **API-Football**          | External API      | Fallback data source                   |

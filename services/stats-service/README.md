# Stats Service

Team statistics, league standings, head-to-head records, and team comparison service.

## Tech Stack

- **Runtime:** Node.js 22
- **Framework:** Express.js
- **Database:** PostgreSQL (Prisma ORM)
- **Cache:** Redis (Upstash)
- **Port:** 3002

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/stats/teams/:id` | Team statistics |
| GET | `/api/stats/teams/:id/form` | Last 5 match form |
| GET | `/api/stats/compare?team1=:id&team2=:id` | Two-team comparison |
| GET | `/api/stats/leagues/:id/standings` | League standings |
| GET | `/api/stats/h2h/:team1/:team2` | Head-to-head records |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | No | Redis for caching |
| `FOOTBALL_DATA_KEY` | No | Football-Data.org API key |
| `API_FOOTBALL_KEY` | No | API-Football key |
| `PORT` | No | Server port (default: 3002) |

## Setup

```bash
pnpm install
pnpm --filter stats-service dev
```

## Cache TTL

| Data | TTL |
|------|-----|
| Standings | 1 hour |
| Team stats | 30 minutes |
| Team form | 30 minutes |
| H2H records | 2 hours |
| Comparison | 30 minutes |

## Status

- [x] Team statistics endpoint
- [x] Team form (last 5)
- [x] League standings
- [x] Head-to-head records
- [x] Team comparison
- [x] Redis caching
- [x] Health check

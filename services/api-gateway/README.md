# API Gateway

Central entry point for all backend services. Handles routing, rate limiting, CORS, and health aggregation.

## Tech Stack

- **Runtime:** Node.js 22
- **Framework:** Express.js
- **Proxy:** http-proxy-middleware
- **Rate Limiting:** express-rate-limit
- **Port:** 3000

## Routing Table

| Path | Target Service |
|------|---------------|
| `/api/fixtures/*` | match-service:3001 |
| `/api/teams/*` | match-service:3001 |
| `/api/leagues/*` | match-service:3001 |
| `/api/stats/*` | stats-service:3002 |
| `/api/auth/*` | user-service:3003 |
| `/api/profile/*` | user-service:3003 |
| `/api/predictions/*` | ml-service:8000 |
| `/health` | Aggregated health check |

## Rate Limits

| Scope | Limit |
|-------|-------|
| General | 100 req / 15 min |
| Auth endpoints | 20 req / 15 min |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Gateway port (default: 3000) |
| `MATCH_SERVICE_URL` | No | Match service URL (default: http://localhost:3001) |
| `STATS_SERVICE_URL` | No | Stats service URL (default: http://localhost:3002) |
| `USER_SERVICE_URL` | No | User service URL (default: http://localhost:3003) |
| `ML_SERVICE_URL` | No | ML service URL (default: http://localhost:8000) |

## Setup

```bash
pnpm install
pnpm --filter api-gateway dev
```

## Health Check

```bash
curl http://localhost:3000/health
```

Returns aggregated status of all services:

```json
{
  "status": "ok",
  "services": {
    "gateway": "ok",
    "matchService": "ok",
    "statsService": "ok",
    "userService": "ok",
    "mlService": "ok"
  },
  "timestamp": "2026-02-24T..."
}
```

## Status

- [x] Request proxying to all services
- [x] Rate limiting (general + auth)
- [x] CORS handling
- [x] Security headers (Helmet)
- [x] Request logging
- [x] Aggregated health check
- [ ] Request/response transformation
- [ ] Circuit breaker pattern

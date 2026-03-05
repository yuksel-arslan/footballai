# API Gateway

Central entry point for all backend services. Handles request proxying, rate limiting, CORS, security headers, and aggregated health monitoring.

## Tech Stack

- **Runtime:** Node.js 22
- **Framework:** Express.js 4
- **Language:** TypeScript (strict mode)
- **Proxy:** http-proxy-middleware 3
- **Rate Limiting:** express-rate-limit
- **Security:** Helmet, CORS, compression
- **Port:** 3000

## API Endpoints

### Proxy Routing

All requests are proxied to downstream microservices:

| Path                 | Target Service | Port |
| -------------------- | -------------- | ---- |
| `/api/fixtures/*`    | match-service  | 3001 |
| `/api/teams/*`       | match-service  | 3001 |
| `/api/leagues/*`     | match-service  | 3001 |
| `/api/stats/*`       | stats-service  | 3002 |
| `/api/auth/*`        | user-service   | 3003 |
| `/api/profile/*`     | user-service   | 3003 |
| `/api/favorites/*`   | user-service   | 3003 |
| `/api/predictions/*` | ml-service     | 8000 |

### Health Check

| Method | Path      | Description                               |
| ------ | --------- | ----------------------------------------- |
| GET    | `/health` | Aggregated health check from all services |

```json
// GET /health
{
  "status": "ok",
  "services": {
    "gateway": "ok",
    "matchService": "ok",
    "statsService": "ok",
    "userService": "ok",
    "mlService": "ok"
  },
  "timestamp": "2026-03-03T12:00:00Z"
}

// If a service is down:
// HTTP 207 Multi-Status
{
  "status": "degraded",
  "services": {
    "gateway": "ok",
    "matchService": "ok",
    "statsService": "unhealthy",
    "userService": "ok",
    "mlService": "unreachable"
  }
}
```

### Rate Limits

| Scope                          | Limit        | Window     |
| ------------------------------ | ------------ | ---------- |
| General endpoints              | 100 requests | 15 minutes |
| Auth endpoints (`/api/auth/*`) | 20 requests  | 15 minutes |

## Environment Variables

| Variable            | Required | Default               | Description       |
| ------------------- | -------- | --------------------- | ----------------- |
| `PORT`              | No       | 3000                  | Gateway port      |
| `NODE_ENV`          | No       | development           | Environment       |
| `MATCH_SERVICE_URL` | No       | http://localhost:3001 | Match service URL |
| `STATS_SERVICE_URL` | No       | http://localhost:3002 | Stats service URL |
| `USER_SERVICE_URL`  | No       | http://localhost:3003 | User service URL  |
| `ML_SERVICE_URL`    | No       | http://localhost:8000 | ML service URL    |

## Project Structure

```
services/api-gateway/
├── src/
│   ├── config/
│   │   └── services.ts          # Service URLs and route mapping
│   ├── middleware/
│   │   ├── error-handler.ts     # Error handling (502 on proxy failure)
│   │   ├── logger.ts            # Request logging
│   │   └── rate-limiter.ts      # Rate limiting config
│   ├── routes/
│   │   └── proxy.ts             # Proxy route setup
│   └── index.ts                 # Express app entry point
├── .env.example
├── package.json
├── tsconfig.json
└── railway.json
```

## Local Development

```bash
# Install dependencies (from repo root)
pnpm install

# Start dev server with hot reload
pnpm --filter api-gateway dev

# Type check
pnpm --filter api-gateway typecheck

# Build
pnpm --filter api-gateway build

# Run tests
pnpm --filter api-gateway test
```

## Deployment

- **Platform:** Railway (Railpack)
- **Build:** `tsc`
- **Start:** `node dist/index.js`
- **Config:** `railway.json` in service root
- **Health check:** `GET /health`
- **Proxy timeout:** 30 seconds per request

## Dependencies (Other Services)

| Service           | Relationship | Description                            |
| ----------------- | ------------ | -------------------------------------- |
| **match-service** | Proxy target | Fixtures, teams, leagues (port 3001)   |
| **stats-service** | Proxy target | Statistics, standings, H2H (port 3002) |
| **user-service**  | Proxy target | Auth, profile, favorites (port 3003)   |
| **ml-service**    | Proxy target | ML predictions (port 8000)             |

### Request Flow

```
Client -> API Gateway (3000)
           ├── Helmet (security headers)
           ├── CORS
           ├── Compression
           ├── Request Logger
           ├── Rate Limiter
           └── HTTP Proxy -> Downstream Services
```

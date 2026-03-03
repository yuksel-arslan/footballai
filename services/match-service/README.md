# Match Service

Football match data service with WebSocket live scores. Integrates with multiple football data providers (Football-Data.org, API-Football, OpenLigaDB) for fixtures, teams, leagues, and predictions.

## Tech Stack

- **Runtime:** Node.js 22
- **Framework:** Express.js
- **Database:** PostgreSQL (Prisma ORM)
- **Cache:** Redis (Upstash)
- **WebSocket:** socket.io
- **Validation:** Zod
- **AI:** Google Gemini (predictions)
- **Port:** 3001

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (includes WebSocket client count) |
| GET | `/api/fixtures/upcoming` | Upcoming matches |
| GET | `/api/fixtures/live` | Live matches |
| GET | `/api/fixtures/:id` | Match details |
| POST | `/api/fixtures/sync` | Sync from football APIs |
| GET | `/api/teams/:id` | Team details |
| GET | `/api/leagues` | All leagues |
| POST | `/api/predictions/generate` | Generate AI prediction |
| GET | `/api/predictions/:fixtureId` | Get prediction |

## WebSocket Events

Connect to `ws://localhost:3001/ws`

| Event | Direction | Description |
|-------|-----------|-------------|
| `subscribe:live` | Client → Server | Subscribe to all live scores |
| `unsubscribe:live` | Client → Server | Unsubscribe from live scores |
| `subscribe:match` | Client → Server | Subscribe to specific match (fixtureId) |
| `unsubscribe:match` | Client → Server | Unsubscribe from specific match |
| `scores:update` | Server → Client | Live score broadcast (every 30s) |
| `match:{id}:update` | Server → Client | Individual match update |

## Status

- [x] Multi-provider football data integration
- [x] Redis caching layer
- [x] AI-powered predictions (Gemini)
- [x] WebSocket live score updates
- [x] Health check endpoint
- [x] Auth removed (now in user-service)
- [x] Stats removed (now in stats-service)

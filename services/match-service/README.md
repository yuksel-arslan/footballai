# Match Service

Handles football match data, integrates with API-Football, and manages fixtures, teams, and leagues.

## Features

- ✅ API-Football integration
- ✅ Fixture management (upcoming, live, finished)
- ✅ Team and league data
- ✅ Redis caching
- ✅ Rate limiting
- ✅ Database sync

## API Endpoints

### Fixtures

```
GET  /api/fixtures/upcoming?date=2026-01-23&league=39&limit=20
GET  /api/fixtures/live
GET  /api/fixtures/:id
POST /api/fixtures/sync
```

### Teams

```
GET  /api/teams/:id
```

### Leagues

```
GET  /api/leagues
```

## Configuration

### Environment Variables

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
API_FOOTBALL_KEY=your-key
```

### Cache Strategy

- Upcoming fixtures: 1 hour
- Live scores: 30 seconds
- Team info: 24 hours
- League info: 24 hours

## Development

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Build
pnpm build

# Start production
pnpm start
```

## API Football Integration

- **Free Tier:** 500 requests/day
- **Rate Limiting:** Tracked internally
- **Endpoints Used:**
  - `/fixtures` - Match data
  - `/teams` - Team information
  - `/leagues` - League data
  - `/standings` - League tables
  - `/fixtures/headtohead` - H2H records

## Database Sync

Sync fixtures from API Football:

```bash
curl -X POST http://localhost:3001/api/fixtures/sync \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-01-23", "league": 39}'
```

## Architecture

```
match-service/
├── src/
│   ├── config/           # Configuration
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic
│   │   ├── api-football.ts    # API client
│   │   ├── cache.ts           # Redis cache
│   │   └── fixture-service.ts # Fixture logic
│   ├── routes/          # Express routes
│   ├── middleware/      # Express middleware
│   └── index.ts         # Entry point
```

## Error Handling

All errors are caught and returned with appropriate status codes:

- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

## Monitoring

- Request logging with duration
- Cache hit/miss tracking
- API quota monitoring

## Next Steps

- [ ] Add team statistics endpoints
- [ ] Add league standings
- [ ] Implement WebSocket for live updates
- [ ] Add authentication
- [ ] Rate limiting per client

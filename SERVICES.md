# Football AI - Mikroservis Detayları

Her mikroservisin güncel durumu, endpoint'leri ve kullanım bilgileri.

---

## 📊 SERVİS DURUMLARI

| Service | Port | Status | Database | Cache | API Integration |
|---------|------|--------|----------|-------|-----------------|
| API Gateway | 3000 | 🚧 TODO | ❌ | ❌ | N/A |
| Match Service | 3001 | ✅ READY | ✅ Prisma | ✅ Redis | ✅ API-Football |
| Stats Service | 3002 | ✅ READY | ✅ Prisma | ✅ Redis | ✅ API-Football |
| User Service | 3003 | ✅ READY | ✅ Prisma | ❌ | ❌ |
| ML Service | 8000 | 🚧 TODO | ✅ Prisma | ❌ | ❌ |

---

## 1. MATCH SERVICE (Port 3001)

### Genel Bakış
Futbol maçları, takımlar ve ligler hakkında veri sağlar. API-Football ile entegre çalışır.

### Teknolojiler
- **Framework:** Express.js + TypeScript
- **Database:** PostgreSQL (Neon) via Prisma
- **Cache:** Redis (Upstash)
- **External API:** API-Football
- **Validation:** Zod

### Klasör Yapısı
```
services/match-service/
├── src/
│   ├── config/
│   │   └── index.ts              # Env vars, settings
│   ├── controllers/
│   │   └── fixture-controller.ts # Request handlers
│   ├── services/
│   │   ├── api-football.ts       # API Football client
│   │   ├── cache.ts              # Redis cache wrapper
│   │   └── fixture-service.ts    # Business logic
│   ├── routes/
│   │   ├── fixtures.ts           # Fixture routes
│   │   ├── teams.ts              # Team routes (TODO)
│   │   └── leagues.ts            # League routes (TODO)
│   ├── middleware/
│   │   ├── error-handler.ts
│   │   ├── async-handler.ts
│   │   └── request-logger.ts
│   └── index.ts                  # Entry point
├── package.json
├── tsconfig.json
└── README.md
```

### API Endpoints

#### Fixtures

**GET /api/fixtures/upcoming**
Gelecek maçları getirir.

Query Parameters:
- `date` (optional): YYYY-MM-DD format
- `league` (optional): League ID
- `team` (optional): Team ID
- `limit` (optional): Default 20
- `offset` (optional): Default 0

Response:
```json
{
  "data": [
    {
      "id": 1,
      "apiId": 12345,
      "matchDate": "2026-01-24T15:00:00Z",
      "status": "SCHEDULED",
      "homeTeam": { "id": 1, "name": "Man United" },
      "awayTeam": { "id": 2, "name": "Liverpool" },
      "league": { "id": 39, "name": "Premier League" }
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 50
  }
}
```

**GET /api/fixtures/live**
Canlı maçları getirir.

Response:
```json
{
  "data": [
    {
      "id": 2,
      "status": "LIVE",
      "minute": 67,
      "homeScore": 2,
      "awayScore": 1,
      "liveScore": {
        "events": [
          { "type": "goal", "minute": 23, "player": "Rashford" }
        ]
      }
    }
  ],
  "count": 3
}
```

**GET /api/fixtures/:id**
Tek maç detayı.

Response:
```json
{
  "data": {
    "id": 1,
    "homeTeam": {...},
    "awayTeam": {...},
    "league": {...},
    "predictions": [...]
  }
}
```

**POST /api/fixtures/sync**
API-Football'dan maç verilerini senkronize eder.

Request:
```json
{
  "date": "2026-01-24",
  "league": 39
}
```

Response:
```json
{
  "message": "Fixtures synced successfully",
  "synced": 15,
  "updated": 3
}
```

### Cache Strategy

| Data Type | TTL | Key Pattern |
|-----------|-----|-------------|
| Upcoming Fixtures | 1 hour | `fixtures:upcoming:*` |
| Live Scores | 30 seconds | `fixtures:live` |
| Fixture Detail | 1 hour | `fixture:{id}` |
| Team Info | 24 hours | `team:{id}` |

### External API Integration

**API-Football Endpoints Used:**
- `GET /fixtures` - Match data
- `GET /fixtures?live=all` - Live matches
- `GET /teams` - Team information
- `GET /leagues` - League data

**Rate Limiting:**
- Free tier: 500 requests/day
- Tracked internally
- Counter resets at midnight

### Environment Variables
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
API_FOOTBALL_KEY=your-key-here
```

### Commands
```bash
# Development
pnpm dev

# Build
pnpm build

# Start production
pnpm start

# Sync fixtures
curl -X POST http://localhost:3001/api/fixtures/sync \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-01-24", "league": 39}'
```

---

## 2. STATS SERVICE (Port 3002) - TODO

### Genel Bakış
Takım/oyuncu istatistikleri, form analizi, kafa kafaya kayıtları ve lig tabloları.

### Yapılacaklar

#### Controllers
```typescript
// src/controllers/stats-controller.ts
class StatsController {
  getTeamStats()      // GET /api/stats/teams/:id
  getTeamForm()       // GET /api/stats/teams/:id/form
  compareTeams()      // GET /api/stats/compare
  getStandings()      // GET /api/stats/leagues/:id/standings
  getH2H()           // GET /api/stats/h2h/:team1/:team2
}
```

#### Services
```typescript
// src/services/stats-service.ts
class StatsService {
  calculateTeamStats(teamId, season)
  getFormStats(teamId, lastN)
  compareTeams(team1Id, team2Id)
  getLeagueStandings(leagueId, season)
  getH2HRecords(team1Id, team2Id)
  syncStatsFromApi()
}
```

### Planned Endpoints

**GET /api/stats/teams/:id**
```json
{
  "team": {...},
  "season": 2025,
  "stats": {
    "matchesPlayed": 22,
    "wins": 14,
    "draws": 5,
    "losses": 3,
    "goalsFor": 45,
    "goalsAgainst": 21,
    "form": "WWDWL",
    "leaguePosition": 3
  }
}
```

**GET /api/stats/compare?team1=33&team2=34**
```json
{
  "comparison": {
    "team1": {...},
    "team2": {...},
    "headToHead": {
      "totalMatches": 50,
      "team1Wins": 18,
      "team2Wins": 22,
      "draws": 10
    }
  }
}
```

---

## 3. USER SERVICE (Port 3003) - TODO

### Genel Bakış
Kullanıcı yönetimi, authentication, favori takımlar/ligler, bildirimler.

### Teknolojiler
- **Authentication:** JWT
- **Password:** bcrypt
- **Validation:** Zod
- **Database:** Prisma (User, FavoriteTeam, FavoriteLeague)

### Yapılacaklar

#### Authentication
```typescript
// src/services/auth-service.ts
class AuthService {
  register(email, password, fullName)
  login(email, password)
  refreshToken(refreshToken)
  verifyToken(token)
}
```

#### Controllers
```typescript
// src/controllers/auth-controller.ts
class AuthController {
  register()    // POST /api/auth/register
  login()       // POST /api/auth/login
  refresh()     // POST /api/auth/refresh
}

// src/controllers/user-controller.ts
class UserController {
  getProfile()          // GET /api/profile
  updateProfile()       // PUT /api/profile
  getFavoriteTeams()    // GET /api/favorites/teams
  addFavoriteTeam()     // POST /api/favorites/teams/:id
  removeFavoriteTeam()  // DELETE /api/favorites/teams/:id
}
```

### Planned Endpoints

**POST /api/auth/register**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe"
}
```

Response:
```json
{
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "fullName": "John Doe"
  },
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

**POST /api/auth/login**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**GET /api/favorites/teams**
```json
{
  "favorites": [
    {
      "team": {
        "id": 33,
        "name": "Manchester United",
        "logoUrl": "..."
      },
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### JWT Configuration
```typescript
{
  algorithm: 'RS256',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  issuer: 'footballai',
  audience: 'footballai-users'
}
```

---

## 4. ML SERVICE (Port 8000) - TODO

### Genel Bakış
Machine learning modelleri ile maç tahminleri, olasılık hesaplamaları.

### Teknolojiler
- **Language:** Python 3.11
- **Framework:** FastAPI
- **ML Libraries:** XGBoost, Scikit-learn, Pandas
- **Database:** SQLAlchemy + Prisma schema

### Yapılacaklar

#### Main App
```python
# main.py
from fastapi import FastAPI
from models.predictor import MatchPredictor

app = FastAPI()

@app.post("/predict")
async def predict(fixture_id: int):
    """Generate prediction for a match"""
    pass

@app.get("/models/performance")
async def get_performance():
    """Get model accuracy metrics"""
    pass
```

#### Model
```python
# models/predictor.py
class MatchPredictor:
    def __init__(self):
        self.xgb_model = XGBClassifier()
        self.lstm_model = LSTMModel()
    
    def predict(self, features):
        """Generate prediction"""
        pass
    
    def train(self, training_data):
        """Train/retrain model"""
        pass
```

#### Feature Engineering
```python
# services/feature_engineering.py
def extract_features(fixture_id):
    """
    Extract features for prediction:
    - Team form (last 5 matches)
    - Goals scored/conceded
    - Home/away performance
    - Head to head records
    - League position
    - Injuries
    """
    pass
```

### Planned Endpoints

**POST /predict**
```json
{
  "fixture_id": 12345
}
```

Response:
```json
{
  "fixture_id": 12345,
  "prediction": {
    "probabilities": {
      "home_win": 45.2,
      "draw": 28.5,
      "away_win": 26.3
    },
    "predicted_score": {
      "home": 2,
      "away": 1
    },
    "confidence": 72.5,
    "model_version": "v2.1.0"
  },
  "analysis": {
    "key_factors": [
      {
        "factor": "Home Form",
        "impact": 0.35,
        "description": "Man United won 4 of last 5 home games"
      }
    ]
  }
}
```

**GET /models/performance**
```json
{
  "model_version": "v2.1.0",
  "metrics": {
    "accuracy": 68.5,
    "precision": 71.2,
    "recall": 65.8,
    "f1_score": 68.3
  },
  "total_predictions": 1250,
  "correct_predictions": 856
}
```

### Feature List
```python
FEATURES = [
    # Team form
    'home_last_5_wins',
    'home_last_5_draws',
    'home_last_5_losses',
    'away_last_5_wins',
    'away_last_5_draws',
    'away_last_5_losses',
    
    # Goals
    'home_goals_scored_avg',
    'home_goals_conceded_avg',
    'away_goals_scored_avg',
    'away_goals_conceded_avg',
    
    # Position
    'home_league_position',
    'away_league_position',
    'home_points',
    'away_points',
    
    # H2H
    'h2h_home_wins_last_5',
    'h2h_away_wins_last_5',
    'h2h_draws_last_5',
]
```

---

## 5. API GATEWAY (Port 3000) - TODO

### Genel Bakış
Tüm servislerin merkezi giriş noktası. Rate limiting, routing, authentication.

### Teknolojiler
- **Framework:** Express.js
- **Rate Limiting:** express-rate-limit
- **Proxy:** http-proxy-middleware
- **Auth:** JWT verification

### Yapılacaklar

```typescript
// src/index.ts
import { createProxyMiddleware } from 'http-proxy-middleware'
import rateLimit from 'express-rate-limit'

const app = express()

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})

app.use(limiter)

// Routing
app.use('/api/fixtures', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
}))

app.use('/api/stats', createProxyMiddleware({
  target: 'http://localhost:3002',
  changeOrigin: true,
}))

app.use('/api/users', createProxyMiddleware({
  target: 'http://localhost:3003',
  changeOrigin: true,
}))

app.use('/api/predictions', createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
}))
```

### Features
- ✅ Request routing
- ✅ Rate limiting (global + per service)
- ✅ CORS handling
- ✅ Request/response logging
- ✅ Error handling
- ✅ Health checks
- ⏳ Authentication middleware
- ⏳ API key validation

### Rate Limits
```typescript
const limits = {
  global: { windowMs: 15 * 60 * 1000, max: 100 },
  predictions: { windowMs: 60 * 1000, max: 10 }, // Expensive
  auth: { windowMs: 15 * 60 * 1000, max: 5 },
}
```

---

## 🔄 SERVISLER ARASI İLETİŞİM

### Service Dependencies

```
Frontend (Next.js)
    ↓
API Gateway (Port 3000)
    ↓
    ├─→ Match Service (3001)
    │   └─→ Database + Cache
    │
    ├─→ Stats Service (3002)
    │   └─→ Database + Cache
    │
    ├─→ User Service (3003)
    │   └─→ Database
    │
    └─→ ML Service (8000)
        └─→ Match Service (için data)
        └─→ Stats Service (için data)
        └─→ Database
```

### Internal Communication
Servisler arası direkt HTTP çağrıları (production'da service mesh düşünülebilir).

---

## 📊 DATABASE USAGE BY SERVICE

| Service | Models Used | Operations |
|---------|-------------|------------|
| Match | Fixture, Team, League, LiveScore | CRUD |
| Stats | TeamStats, H2HRecord | Read, Sync |
| User | User, FavoriteTeam, FavoriteLeague, Notification | CRUD |
| ML | Prediction, ModelMetrics, TrainingData | Create, Read |

---

## 🚀 DEPLOYMENT CHECKLIST

### Per Service
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Health check endpoint working
- [ ] Logging configured
- [ ] Error handling tested
- [ ] Rate limiting configured
- [ ] README.md updated

### Integration
- [ ] Services can communicate
- [ ] API Gateway routes correctly
- [ ] Database connections stable
- [ ] Cache working properly
- [ ] External APIs accessible

---

**Son Güncelleme:** 23 Ocak 2026
**Durum:** Match Service ve Stats Service tamamlandı

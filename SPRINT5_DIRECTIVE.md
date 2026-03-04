# FootballAI — Sprint 5 Claude Code Direktifi

Tarih: 3 Mart 2026
Repo: github.com/yuksel-arslan/footballai.git (main branch)
Monorepo: pnpm + Turborepo | Deploy: Vercel (web) + Railway/Railpack (services) + Neon (DB) + Upstash (Redis)

---

## GOREV 1 — Vitest Config + Test Runner (ONCELIK: YUKSEK)

Testler yazilmis ama vitest.config.ts yok. Testler calismiyor.

### 1.1 Root vitest workspace config

Her serviste vitest ^2.1.8 var. Root'ta workspace config olustur:

Dosya: vitest.workspace.ts

```typescript
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'services/match-service',
  'services/api-gateway',
  'services/stats-service',
  'services/user-service',
])
```

### 1.2 Her servis icin vitest.config.ts

4 servis icin ayni pattern:

Dosya: services/<servis>/vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/types/**'],
    },
  },
})
```

### 1.3 Root package.json'a vitest ekle

```bash
pnpm add -Dw vitest
```

### 1.4 Test calistir ve fix et

```bash
pnpm test
```

Tum 5 test dosyasi gecmeli. Gecmeyenleri fix et.
Prisma mock pattern: `vi.mock('@football-ai/database', ...)` dogru calismali.

### 1.5 CI pipeline'da continue-on-error kaldir

.github/workflows/ci.yml'de test job'unda:

```yaml
- name: Run tests
  run: pnpm test
  # continue-on-error: true  <- KALDIR, testler artik gecmeli
```

Commit: `feat: vitest workspace config + test runner setup`

---

## GOREV 2 — ML Training Data Pipeline (ONCELIK: YUKSEK)

XGBoost egitilmemis. Training data pipeline yok. DB'den veri cekip model egitmeli.

### 2.1 Training data export endpoint (match-service)

Dosya: services/match-service/src/routes/fixtures.ts

Yeni endpoint ekle:

```
GET /api/fixtures/training-data?limit=500
```

Response: Tamamlanmis maclar + team stats + H2H bilgisi. Sadece status=FINISHED maclari don.

```typescript
router.get(
  '/training-data',
  asyncHandler(async (req, res) => {
    const limit = parseInt(String(req.query.limit || '500'))
    const fixtures = await prisma.fixture.findMany({
      where: { status: 'FINISHED' },
      include: {
        homeTeam: true,
        awayTeam: true,
        league: true,
      },
      orderBy: { matchDate: 'desc' },
      take: limit,
    })

    // Her mac icin training format olustur
    const trainingData = fixtures.map((f) => ({
      fixture_id: f.id,
      home_team: {
        team_id: f.homeTeam.id,
        name: f.homeTeam.name,
        // TeamStats tablosundan cek
      },
      away_team: {
        team_id: f.awayTeam.id,
        name: f.awayTeam.name,
      },
      result:
        f.homeScore > f.awayScore ? 0 : f.homeScore === f.awayScore ? 1 : 2,
      home_score: f.homeScore,
      away_score: f.awayScore,
    }))

    res.json({ success: true, data: trainingData, count: trainingData.length })
  })
)
```

NOT: TeamStats tablosu Prisma schema'da var. Her fixture icin ilgili team stats'i join et. H2HRecord tablosunu da kullan.

### 2.2 ML service — auto-fetch + train endpoint

Dosya: services/ml-service/app/routers/predictions.py

Yeni endpoint:

```
POST /api/predictions/train/auto
```

Bu endpoint:

1. match-service'ten GET /api/fixtures/training-data ceker (httpx ile)
2. Feature engineering uygular
3. XGBoost'u egitir
4. Model'i trained_models/xgboost_v1.joblib olarak kaydeder
5. Accuracy metrics doner

Config'den MATCH_SERVICE_URL al (default: http://localhost:3001).

### 2.3 Model persistence

services/ml-service/app/models/xgboost_model.py'de save/load metotlari var mi kontrol et.
Yoksa ekle:

```python
import joblib

def save_model(self, path: str = 'trained_models/xgboost_v1.joblib'):
    joblib.dump(self.model, path)

def load_model(self, path: str = 'trained_models/xgboost_v1.joblib'):
    self.model = joblib.load(path)
```

Commit: `feat: ML training data pipeline + auto-train endpoint`

---

## GOREV 3 — Production CORS Config (ONCELIK: ORTA)

### 3.1 api-gateway CORS whitelist

Dosya: services/api-gateway/src/index.ts

Simdi `app.use(cors())` — herkese acik. Production icin:

```typescript
const allowedOrigins = [
  'https://footballai.io',
  'https://www.footballai.io',
  process.env.FRONTEND_URL,
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
].filter(Boolean) as string[]

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)
```

### 3.2 Diger servislerde de ayni pattern

match-service, stats-service, user-service index.ts'lerinde de CORS'u ayni sekilde guncelle.

Commit: `fix: production CORS whitelist`

---

## GOREV 4 — Structured Logging (ONCELIK: ORTA)

### 4.1 pino ekle

```bash
pnpm add pino pino-pretty --filter match-service --filter api-gateway --filter stats-service --filter user-service
```

### 4.2 Logger utility olustur

Her serviste src/lib/logger.ts:

```typescript
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  base: { service: '<servis-adi>' },
})
```

### 4.3 console.log -> logger

Tum servislerde console.log/error/warn -> logger.info/error/warn degistir.
Request logger middleware'i de pino kullansin.

Commit: `feat: structured logging with pino`

---

## GOREV 5 — CI Pipeline Guclendir (ONCELIK: DUSUK)

### 5.1 Test job'unda continue-on-error kaldir

.github/workflows/ci.yml:

- Test job: continue-on-error: true -> KALDIR
- Lint job: continue-on-error: true -> KALDIR (veya uyarilari fix et)
- Typecheck job: continue-on-error: true -> KALDIR

### 5.2 ML service pytest

CI'da ml-service test job'u var ama continue-on-error: true. Testleri calistir, fix et, continue-on-error kaldir.

Commit: `ci: enforce test and lint checks`

---

## CALISMA SIRASI

1. Gorev 1 (Vitest config) — testler calismali
2. Gorev 2 (ML pipeline) — training data + auto-train
3. Gorev 3 (CORS) — production whitelist
4. Gorev 4 (Logging) — pino
5. Gorev 5 (CI) — continue-on-error kaldir

Her gorev sonrasi commit + push. Conventional commits: fix:, feat:, ci:, refactor:

## TEKNIK NOTLAR

- pnpm monorepo + Turborepo
- tsconfig strict:true, noUnusedLocals:true, noUnusedParameters:true
- Express req.query: her zaman String() ile cast
- Railway builder: RAILPACK (NIXPACKS degil)
- Prisma modeller: League, Team, Fixture, LiveScore, Prediction, TeamStats, H2HRecord, User, LoginAuditLog, TokenBlacklist, FavoriteTeam, FavoriteLeague, UserPrediction, Notification, ModelMetrics
- Vitest ^2.1.8 tum servislerde dependency olarak var
- ML service: Python 3.11, FastAPI, pytest

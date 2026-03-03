# FootballAI - Claude Code Direktifi

Tarih: 3 Mart 2026
Repo: github.com/yuksel-arslan/footballai.git
Branch: main

## MEVCUT DURUM

Sprint 1-2 tamam. Sprint 3 Gun 1-3 tamam.
Aktif: Railway build fail (match-service tsc 8 hata) + Vercel build fail (use-websocket.ts type leak)

## GOREV 1 - Railway TS Build Fix (KRITIK)

### 1.1 prediction.controller.ts

services/match-service/src/controllers/prediction.controller.ts

- err tipi unknown: cast -> (await response.json().catch(() => ({}))) as Record<string, string>
- next unused: \_next: NextFunction yap veya kaldir

### 1.2 leagues.ts

services/match-service/src/routes/leagues.ts
Express req.query tipi string | string[] | ParsedQs. as string yerine String() kullan:
const code = String(req.params.code)
const limit = parseInt(String(req.query.limit || '20'))
const season = req.query.season ? parseInt(String(req.query.season)) : new Date().getFullYear()

### 1.3 teams.ts

services/match-service/src/routes/teams.ts
Ayni String() pattern. ONEMLI: GET / (search) route GET /:id den ONCE tanimla.

### 1.4 Dogrula

cd services/match-service && npx tsc --noEmit (0 hata olmali)

## GOREV 2 - Vercel useWebSocket Fix (KRITIK)

apps/web/src/hooks/use-websocket.ts

KURAL: socket.io-client ASLA top-level import etme. Dynamic import kullan:
import("socket.io-client").then(({ io }) => { ... })

socketRef tipi: { emit: (e: string, ...a: unknown[]) => void; disconnect: () => void } | null
Return type'da Socket tipi OLMAMALI. UseWebSocketReturn interface tanimla ve explicit return type ver.

Dogrula: pnpm --filter web build

## GOREV 3 - Mikroservis Dokumantasyonu (Sprint 4)

Her servis README.md guncelle. Icerik:

1. Genel Bakis
2. Tech Stack
3. API Endpoints (method, path, request/response ornekleri)
4. Ortam Degiskenleri tablosu
5. Proje Yapisi (klasor agaci)
6. Yerel Gelistirme komutlari
7. Deployment bilgileri
8. Bagimliliklar (diger servislerle iliski)

Servisler:

1. match-service - fixtures, leagues, teams, predictions, Gemini AI, ML proxy
2. api-gateway - proxy routing tum servislere
3. stats-service - team stats, form, comparison, standings, H2H
4. user-service - auth (JWT, Google OAuth), profile, favorites, 2FA
5. ml-service (Python) - Poisson, XGBoost, Ensemble, FastAPI
6. apps/web - Next.js 15 frontend

## GOREV 4 - ML Pipeline Tamamlama

4.1 Feature Engineering dogrula: services/ml-service/app/services/feature_engineering.py
Home/Away form, goals avg, H2H, league position diff, home advantage, clean sheet ratio

4.2 Training pipeline: services/ml-service/app/services/training_service.py
Historical data, feature extraction, XGBoost train, model persistence, metrics

4.3 Model versioning: services/ml-service/models/ + model_metadata.json

## GOREV 5 - Genel Kalite

- Health check: GET /health tum servislerde { status: ok, service, version, uptime }
- Error response standardize: { success: false, error: msg, code: CODE }
- Root README.md guncelle

## CALISMA SIRASI

1. ONCELIK 1: Gorev 1 + 2 (build fix) -> commit + push
2. ONCELIK 2: Gorev 3 (dokumantasyon) -> docs: commits
3. ONCELIK 3: Gorev 4 + 5 (ML + kalite) -> feat: ve refactor: commits

## TEKNIK NOTLAR

- pnpm monorepo + Turborepo
- Vercel (web), Railway/Nixpacks (backend), Neon (PostgreSQL), Upstash (Redis)
- tsconfig strict:true, noUnusedLocals:true, noUnusedParameters:true
- Express req.query: her zaman String() ile cast
- Next.js 15 params: Promise -> const { id } = await params
- socket.io-client: dynamic import only

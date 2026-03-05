# Railway Monorepo Deployment Guide

FootballAI monorepo'su Railway'de **ayrı servisler** olarak deploy edilir. Her servis kendi `railway.json` dosyasını kullanır, Railpack ile build olur.

## Servis Listesi

| Servis        | Port | Railway Root Dir      | railway.json                          |
| ------------- | ---- | --------------------- | ------------------------------------- |
| API Gateway   | 3000 | `/`                   | `services/api-gateway/railway.json`   |
| Match Service | 3001 | `/`                   | `railway.json` (root)                 |
| Stats Service | 3002 | `/`                   | `services/stats-service/railway.json` |
| User Service  | 3003 | `/`                   | `services/user-service/railway.json`  |
| ML Service    | 8000 | `services/ml-service` | `services/ml-service/railway.json`    |

## Railway'de Yeni Servis Oluşturma

### Node.js Servisleri (api-gateway, match, stats, user)

1. Railway Dashboard → New → GitHub Repo → `yuksel-arslan/footballai`
2. Settings:
   - **Root Directory:** `/` (monorepo root — pnpm workspace erişimi için)
   - **Build Command:** Her servisin `railway.json` → `build.buildCommand` alanı
   - **Start Command:** Her servisin `railway.json` → `deploy.startCommand` alanı
   - **Health Check Path:** `/health`
3. Variables:
   - `DATABASE_URL` → Neon connection string
   - `REDIS_URL` → Upstash connection string
   - `JWT_SECRET` → min 32 karakter
   - Diğer servis-bazlı env vars (bkz: `.env.example` dosyaları)

### ML Service (Python/FastAPI)

1. Railway Dashboard → New → GitHub Repo → `yuksel-arslan/footballai`
2. Settings:
   - **Root Directory:** `services/ml-service` (izole Python projesi)
   - **Builder:** Railpack (Python otomatik algılanır)
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/health`
3. Variables:
   - `DATABASE_URL`, `REDIS_URL`, `FOOTBALL_DATA_KEY`

## Hangi Servis Hangi railway.json Kullanıyor?

Railway monorepo'da her servis için ayrı bir "service" oluşturursun. Her service'in ayarlarında **Custom Build Command** ve **Custom Start Command** belirlenir. `railway.json` dosyası ise varsayılan olarak root'takini okur.

**Önemli:** Aynı repo'dan birden fazla servis deploy ederken, Railway'de her servisin **environment variables**'ını ayrı ayrı tanımlamalısın. Shared variables (DATABASE_URL gibi) için Railway'in "Shared Variables" özelliğini kullanabilirsin.

## Internal Networking

Railway servisleri aynı proje içinde birbirine **private networking** ile bağlanabilir:

```
# API Gateway env variables (Railway'de)
MATCH_SERVICE_URL=http://match-service.railway.internal:3001
STATS_SERVICE_URL=http://stats-service.railway.internal:3002
USER_SERVICE_URL=http://user-service.railway.internal:3003
ML_SERVICE_URL=http://ml-service.railway.internal:8000
```

## Deploy Tetikleme

- `main` branch'e push → Tüm servisler otomatik redeploy
- Railway Dashboard → Manual Deploy butonu
- Railway CLI: `railway up`

## Ortam Değişkenleri Checklist

Her servise eklenmesi gereken minimum env vars:

```
# Tüm Node servisleri
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NODE_ENV=production

# match-service ek
JWT_SECRET=...
FOOTBALL_DATA_KEY=...
GEMINI_API_KEY=...

# user-service ek
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_APP_URL=https://footballai.io

# api-gateway ek
MATCH_SERVICE_URL=...
STATS_SERVICE_URL=...
USER_SERVICE_URL=...
ML_SERVICE_URL=...
```

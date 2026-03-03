# FootballAI - Claude Code Geliştirme Talimatları

**Tarih:** 24 Şubat 2026  
**Repo:** https://github.com/yuksel-arslan/footballai.git  
**Domain:** footballai.io  
**Geliştirici:** Yuksel Arslan  

---

## 1. PROJE GÜNCEL DURUM ANALİZİ

### ✅ Tamamlanan (135 commit)

| Modül | Durum | Detay |
|-------|-------|-------|
| **Monorepo Yapısı** | ✅ | Turborepo + pnpm workspaces |
| **Database Schema** | ✅ | 15 Prisma model (League, Team, Fixture, Prediction, User, TeamStats, H2H, LiveScore, Notification, ModelMetrics, LoginAuditLog, TokenBlacklist, FavoriteTeam, FavoriteLeague, UserPrediction) |
| **Next.js Frontend** | ✅ ~%70 | Next.js 15 + App Router, Tailwind CSS, dark/light mode, i18n (TR/EN), PWA manifest/SW |
| **Match Service** | ✅ | Express.js, Port 3001 - fixtures, teams, leagues, auth, stats, predictions routes |
| **ML Service** | ✅ Temel | FastAPI + Poisson model (v1.0.0-poisson), predictions endpoint |
| **Auth Sistemi** | ✅ | Register, Login, Forgot/Reset Password, 2FA, Google OAuth, Email Verification, Token Blacklist, Login Audit |
| **Gemini AI** | ✅ | AI-powered predictions via Google Generative AI |
| **Admin Panel** | ✅ Temel | Admin sayfası mevcut |
| **Frontend Sayfalar** | ✅ | Home, Matches, Predictions, Standings, Favorites, League, Offline, Auth sayfaları |
| **Bileşenler** | ✅ | Header, Sidebar, MatchCard, MatchList, LiveScores, LeagueTable, QuickStats, MatchPrediction, AIHighlights, ThemeToggle, AnimatedLogo |
| **Vercel Deploy** | ✅ | vercel.json, build fixleri tamamlandı |

### ❌ Eksik / Sorunlu Olanlar

| Sorun | Detay |
|-------|-------|
| **Mock Data Bağımlılığı** | Frontend hâlâ `mock-data.ts`'e bağımlı, gerçek API entegrasyonu eksik |
| **Stats Service yok** | `services/stats-service/` klasörü hiç oluşturulmamış |
| **User Service yok** | `services/user-service/` klasörü yok, auth match-service içinde |
| **API Gateway yok** | `services/api-gateway/` yok |
| **ML Model ilkel** | Sadece Poisson - XGBoost/LSTM/Ensemble henüz yok |
| **Testler yok** | Hiçbir servis için test yazılmamış |
| **Real-time yok** | WebSocket/SSE ile canlı skor güncellemesi yok |
| **node_modules yok** | `pnpm install` yapılmamış (gitignore'da) |
| **Eski repo referansları** | CLAUDE_CODE_GUIDE.md'de `futball-ai` referansları var, `footballai`'a güncellenmeli |
| **Mikro servis .md'leri eksik** | Her servisin güncel README.md dosyası yok |
| **font/tip güncellemesi** | Fontlar modern trend değil (Inter/Geist olmayabilir) |

---

## 2. GELİŞTİRME TALİMATLARI

### Kural: Tercihler

- **Python 3.11** kullan
- **Node.js 22+** kullan
- **Tailwind CSS** kullan
- **Dark/Light mode** her yerde olmalı
- **Fontlar** en son trend olmalı (Geist, Inter, veya JetBrains Mono kod için)
- **Her mikroservisin güncel .md dosyası** olmalı ve o servis hakkında tüm bilgileri vermeli
- Kısa ve öz açıklamalar

---

## 3. PHASE 2 - HEMEN YAPILACAKLAR (Öncelik Sırası)

### 3.1 Proje Temizliği ve Güncelleme

```bash
# 1. Repo'yu klonla
git clone https://github.com/yuksel-arslan/footballai.git
cd footballai

# 2. Bağımlılıkları kur
pnpm install

# 3. Tüm dosyalarda eski "futball-ai" referanslarını "footballai" ile değiştir
# CLAUDE_CODE_GUIDE.md, GITHUB_PUSH_GUIDE.md, push-to-github.sh, setup-git.sh
```

**GÖREV:** Tüm dokümantasyondaki `futball-ai` referanslarını `footballai` olarak güncelle. repo URL'si: `https://github.com/yuksel-arslan/footballai.git`

### 3.2 Modern Font Sistemi

```
apps/web/src/app/layout.tsx içinde:
- Geist Sans (ana font) + Geist Mono (kod font) kullan
- next/font/google veya next/font/local ile yükle
- Tailwind config'e entegre et
```

**GÖREV:** layout.tsx'de font sistemini güncelle:
```typescript
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
// veya
import { Inter } from 'next/font/google'
```

### 3.3 Her Mikroservis İçin README.md Güncelle

Her servis klasöründe güncel bir README.md oluştur. Şablon:

```markdown
# [Servis Adı]

## Genel Bakış
[Kısa açıklama]

## Tech Stack
- Runtime: Node.js 22 / Python 3.11
- Framework: Express.js / FastAPI
- Database: PostgreSQL (Prisma)
- Cache: Redis (Upstash)

## Endpoints
| Method | Path | Açıklama |
|--------|------|----------|
| GET | /api/... | ... |

## Environment Variables
| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|

## Kurulum
[komutlar]

## Durum
- [x] Tamamlanan
- [ ] Bekleyen
```

Güncellenecek servisler:
1. `services/match-service/README.md` → Mevcut, güncelle
2. `services/ml-service/README.md` → **YOK, oluştur**
3. `apps/web/README.md` → Mevcut, güncelle

### 3.4 Mock Data'dan Gerçek API'ye Geçiş

**Bu en kritik görev.** Frontend şu an tamamen mock-data.ts'e bağımlı.

**Adımlar:**
1. `apps/web/src/lib/api.ts` → Match Service API'ye bağlan (gerçek fetch)
2. `apps/web/src/lib/api-client.ts` → Axios/fetch wrapper güncelle
3. Mock data'yı fallback olarak tut (API yoksa göster, varsa gerçek veri)
4. Her component'te loading/error state ekle
5. TanStack Query hooks'larını aktifleştir:
   - `hooks/use-fixtures.ts` → gerçek API'ye bağla
   - `hooks/usePrediction.ts` → ML Service'e bağla

**Bağlantı akışı:**
```
Frontend (Next.js) 
  → /api/football (proxy route) 
    → Match Service (localhost:3001) 
      → API-Football / Football-Data.org
```

### 3.5 Stats Service Oluştur

```
services/stats-service/
├── src/
│   ├── index.ts              # Express server (Port 3002)
│   ├── config/
│   │   └── index.ts
│   ├── controllers/
│   │   └── stats.controller.ts
│   ├── services/
│   │   ├── stats.service.ts
│   │   └── api-football.ts   # match-service'den kopyala
│   ├── routes/
│   │   └── stats.routes.ts
│   ├── middleware/
│   │   ├── error-handler.ts
│   │   └── request-logger.ts
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

**Endpoints:**
```
GET  /api/stats/teams/:id           → Takım istatistikleri
GET  /api/stats/teams/:id/form      → Son 5 maç formu
GET  /api/stats/compare             → İki takım karşılaştırması (query: team1, team2)
GET  /api/stats/leagues/:id/standings → Lig puan tablosu
GET  /api/stats/h2h/:team1/:team2   → Head-to-head kayıtları
GET  /health                        → Sağlık kontrolü
```

**ÖNEMLİ:** match-service yapısını referans al, aynı middleware/config pattern'ını kullan.

### 3.6 User Service Oluştur

Şu an auth match-service içinde. Ayrı servise taşı:

```
services/user-service/
├── src/
│   ├── index.ts              # Express server (Port 3003)
│   ├── config/
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   └── profile.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   └── user.service.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   └── profile.routes.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts    # JWT verification
│   │   └── error-handler.ts
│   └── types/
│       └── auth.types.ts
├── package.json
├── tsconfig.json
└── README.md
```

**Endpoints:**
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/verify-email
POST /api/auth/2fa/enable
POST /api/auth/2fa/verify
GET  /api/auth/me
GET  /api/profile
PUT  /api/profile
GET  /api/favorites/teams
POST /api/favorites/teams/:id
DELETE /api/favorites/teams/:id
GET  /api/favorites/leagues
POST /api/favorites/leagues/:id
DELETE /api/favorites/leagues/:id
```

**ÖNEMLİ:** `services/match-service/src/controllers/auth.controller.ts`, `services/match-service/src/services/auth.service.ts` ve ilgili dosyaları taşı. Match-service'den auth route'larını kaldır.

### 3.7 API Gateway Oluştur

```
services/api-gateway/
├── src/
│   ├── index.ts              # Express server (Port 3000)
│   ├── config/
│   │   └── services.ts       # Servis URL'leri
│   ├── middleware/
│   │   ├── rate-limiter.ts
│   │   ├── cors.ts
│   │   ├── logger.ts
│   │   └── error-handler.ts
│   └── routes/
│       └── proxy.ts          # http-proxy-middleware
├── package.json
├── tsconfig.json
└── README.md
```

**Routing tablosu:**
```
/api/fixtures/*    → match-service:3001
/api/teams/*       → match-service:3001
/api/leagues/*     → match-service:3001
/api/stats/*       → stats-service:3002
/api/auth/*        → user-service:3003
/api/profile/*     → user-service:3003
/api/favorites/*   → user-service:3003
/api/predictions/* → ml-service:8000
/health            → Tüm servislerin health check'i
```

---

## 4. PHASE 3 - ML SERVİSİNİ GELİŞTİR

### 4.1 XGBoost Model Ekle

Mevcut Poisson model temel. XGBoost ekle:

```python
# services/ml-service/app/models/
├── base_model.py          # Abstract base class
├── poisson_model.py       # Mevcut model (refactor)
├── xgboost_model.py       # YENİ - XGBoost classifier
└── ensemble_model.py      # YENİ - Ensemble (Poisson + XGBoost)
```

**Feature engineering (`services/ml-service/app/services/feature_engineering.py`):**
```python
features = {
    'home_form_score': float,      # Son 5 maç
    'away_form_score': float,
    'home_attack_strength': float,
    'away_attack_strength': float,
    'home_defense_strength': float,
    'away_defense_strength': float,
    'h2h_home_win_rate': float,
    'h2h_draw_rate': float,
    'league_position_diff': int,
    'home_goals_per_game': float,
    'away_goals_per_game': float,
    'home_clean_sheet_rate': float,
    'away_clean_sheet_rate': float,
    'days_since_last_match': int,
}
```

### 4.2 Model Training Pipeline

```python
# services/ml-service/app/services/training_service.py
# - Historical data'yı API-Football'dan çek
# - Feature engineering uygula
# - XGBoost model'i eğit
# - Model metrikleri hesapla ve DB'ye kaydet (ModelMetrics tablosu)
# - Model'i pickle/joblib ile kaydet
```

**Yeni endpoint:**
```
POST /api/predictions/train        → Model eğitimi başlat
GET  /api/predictions/models       → Mevcut modeller listesi
GET  /api/predictions/performance  → Model performans metrikleri
```

---

## 5. PHASE 4 - REAL-TIME & POLISH

### 5.1 WebSocket ile Canlı Skor

```typescript
// services/match-service/src/services/websocket.ts
// Socket.io veya ws kütüphanesi
// LiveScore modelini kullan
// 30 saniyede bir güncelleme
```

### 5.2 Notification Sistemi

```
// Prisma Notification modeli zaten var
// User Service'e notification endpoint'leri ekle
// Frontend'de notification bell component
// Push notification (web push API)
```

### 5.3 PWA Geliştirmeleri

```
// Mevcut: manifest + service worker var
// Ekle: offline mode iyileştir
// Ekle: background sync
// Ekle: push notifications
```

---

## 6. TEKNİK NOTLAR

### Mevcut Tech Stack
```
Frontend:  Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Zustand, TanStack Query
Backend:   Node.js 22, Express.js, Prisma ORM
ML:        Python 3.11, FastAPI, scipy (Poisson), scikit-learn, xgboost, pandas
Database:  PostgreSQL (Neon), Redis (Upstash)
AI:        Google Gemini (generative AI predictions)
Deploy:    Vercel (frontend), Railway (backend)
Auth:      JWT, bcrypt, Google OAuth, 2FA (TOTP)
i18n:      TR/EN çeviri sistemi
```

### Port Dağılımı
```
3000 → API Gateway (YOK, oluşturulacak)
3001 → Match Service ✅
3002 → Stats Service (YOK, oluşturulacak)
3003 → User Service (YOK, oluşturulacak)
8000 → ML Service ✅ (temel)
3100 → Next.js Dev Server
```

### Environment Variables (.env.example)
```
DATABASE_URL=postgresql://...@neon.tech/footballai
REDIS_URL=redis://...@upstash.com
API_FOOTBALL_KEY=xxx
FOOTBALL_DATA_KEY=xxx
JWT_SECRET=xxx
JWT_REFRESH_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GEMINI_API_KEY=xxx
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3100
```

### Dosya Yapısı (Hedef)
```
footballai/
├── apps/
│   └── web/                    # Next.js 15 frontend
├── packages/
│   ├── database/               # Prisma schema + client
│   └── typescript-config/      # Shared TS configs
├── services/
│   ├── api-gateway/            # Port 3000 (YENİ)
│   ├── match-service/          # Port 3001 ✅
│   ├── stats-service/          # Port 3002 (YENİ)
│   ├── user-service/           # Port 3003 (YENİ)
│   └── ml-service/             # Port 8000 ✅
├── CLAUDE_CODE_GUIDE.md        # Güncelle
├── README.md
├── package.json
├── turbo.json
└── pnpm-workspace.yaml
```

---

## 7. BAŞLANGIÇ KOMUTU

Claude Code'a bu talimatı okumasını söyle, sonra şunu de:

> Bu FOOTBALLAI_CLAUDE_CODE_INSTRUCTIONS.md dosyasını oku. Projenin GitHub repo'su: https://github.com/yuksel-arslan/footballai.git
>
> Sırayla şunları yap:
> 1. Repo'yu klonla ve `pnpm install` çalıştır
> 2. Tüm dosyalarda "futball-ai" referanslarını "footballai" olarak güncelle
> 3. Modern font sistemi ekle (Geist Sans + Geist Mono)
> 4. Her mikroservis için güncel README.md oluştur/güncelle
> 5. Stats Service'i oluştur (Section 3.5)
> 6. User Service'i oluştur - match-service'den auth'u taşı (Section 3.6)
> 7. API Gateway'i oluştur (Section 3.7)
> 8. Frontend'i mock data'dan gerçek API'ye geçir (Section 3.4)
> 9. CLAUDE_CODE_GUIDE.md'yi güncel duruma göre yeniden yaz
> 10. Tüm değişiklikleri commit et

**Her adımı tamamladıktan sonra commit at.** Commit mesajları conventional commits formatında olsun (feat:, fix:, docs:, refactor:).

---

## 8. KALİTE STANDARTLARI

- TypeScript strict mode
- Her fonksiyona JSDoc/docstring
- Error handling her yerde
- Loading/skeleton states frontend'de
- Responsive tasarım (mobile-first)
- Dark/light mode tutarlılığı
- Accessibility (aria labels)
- Her servis için health endpoint
- Console.log yerine proper logger kullan

# FootballAI - AI-Powered Football Match Predictions

> Yapay zeka destekli futbol maç tahminleri platformu. Next.js 16, Express.js mikroservisler, Poisson + XGBoost ensemble ML modeli ve WebSocket canlı skor desteği ile geliştirilmiştir.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma)](https://www.prisma.io/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://www.python.org/)

## Ozellikler

- **AI Tahminleri** - Poisson + XGBoost ensemble model
- **Detaylı Istatistikler** - Takim formu, H2H kayitlari, lig tablolari
- **Canli Skorlar** - WebSocket ile real-time mac guncellemeleri
- **Modern UI** - Next.js 16 + Tailwind CSS ile responsive tasarim
- **Guvenli** - JWT, 2FA (TOTP), Google OAuth, hesap kilitleme, rate limiting
- **PWA** - Progressive Web App destegi

## Mimari

### Monorepo Yapisi (Turborepo)

```
footballai/
├── apps/
│   └── web/                 # Next.js 16 frontend
├── packages/
│   ├── database/            # Prisma schema (15 model)
│   └── typescript-config/   # Shared TS configs
└── services/
    ├── api-gateway/         # Express.js gateway (Port 3000)
    ├── match-service/       # Mac verileri + WebSocket (Port 3001)
    ├── stats-service/       # Istatistikler (Port 3002)
    ├── user-service/        # Auth & profil (Port 3003)
    └── ml-service/          # ML predictions (Port 8000)
```

### Tech Stack

**Frontend:**
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- TanStack Query + Zustand
- socket.io-client

**Backend:**
- Node.js 22
- Express.js + socket.io
- Prisma ORM
- PostgreSQL (Neon)
- Redis (Upstash)
- Zod validation

**ML Service:**
- Python 3.11
- FastAPI
- XGBoost + Poisson Ensemble
- scikit-learn, scipy
- Feature Engineering (21 features)

**Auth:**
- JWT + token blacklisting
- 2FA (TOTP via speakeasy)
- Google OAuth 2.0
- Email verification
- Account lockout + audit trail

## Quick Start

### Prerequisites

- Node.js 22+
- Python 3.11+
- pnpm 9+

### Installation

```bash
# Clone repository
git clone https://github.com/yuksel-arslan/footballai.git
cd footballai

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Setup database
cd packages/database
pnpm db:generate
pnpm db:push

# Start development
cd ../..
pnpm dev
```

## API Endpoints

### Match Service (Port 3001)

```
GET  /api/fixtures/upcoming      # Gelecek maclar
GET  /api/fixtures/live          # Canli maclar
GET  /api/fixtures/:id           # Mac detayi
POST /api/fixtures/sync          # API-Football sync
WS   /ws                         # WebSocket canli skor
```

### Stats Service (Port 3002)

```
GET  /api/stats/teams/:id        # Takim istatistikleri
GET  /api/stats/compare          # Takim karsilastirma
GET  /api/stats/leagues/:id/standings  # Lig tablosu
GET  /api/stats/h2h/:team1/:team2     # Kafa kafaya
```

### User Service (Port 3003)

```
POST /api/auth/register          # Kayit
POST /api/auth/login             # Giris
POST /api/auth/logout            # Cikis
GET  /api/auth/me                # Profil
POST /api/auth/2fa/setup         # 2FA kurulumu
POST /api/auth/forgot-password   # Sifre sifirlama
GET  /api/auth/google            # Google OAuth
```

### ML Service (Port 8000)

```
POST /api/predictions/predict    # Tekli tahmin
POST /api/predictions/predict/batch  # Toplu tahmin
POST /api/predictions/train      # Model egitimi
GET  /api/predictions/models     # Model listesi
GET  /api/predictions/performance  # Model performansi
```

## Testing

```bash
# Run all tests
pnpm test

# Test with coverage
pnpm test:coverage

# Test specific service
pnpm --filter match-service test

# ML service tests
cd services/ml-service && pytest tests/
```

## Roadmap

### Phase 1: MVP - Completed
- [x] Repository setup + database schema
- [x] Next.js frontend
- [x] Match Service with API integration

### Phase 2: Core Features - Completed
- [x] Stats Service, User Service, API Gateway
- [x] ML Service (Poisson model)
- [x] Authentication (JWT, 2FA, OAuth)
- [x] Frontend-Backend integration

### Phase 3: Enhancement - Completed
- [x] Auth consolidation (frontend proxy -> user-service)
- [x] XGBoost ML model + ensemble
- [x] WebSocket live scores
- [x] Predictions page connected to real API
- [x] Test coverage for all services

### Phase 4: Launch
- [ ] LSTM time-series model
- [ ] Push notifications
- [ ] E2E tests
- [ ] Performance optimization
- [ ] Production deployment

## Documentation

- **[CLAUDE_CODE_GUIDE.md](CLAUDE_CODE_GUIDE.md)** - Detayli gelistirme kilavuzu
- **[FRONTEND_DESIGN_PRINCIPLES.md](FRONTEND_DESIGN_PRINCIPLES.md)** - UI/UX prensipleri
- **[TECHNICAL_SPEC.md](FOOTBALL_PREDICTION_TECHNICAL_SPEC.md)** - Teknik sartname

## Author

**Yuksel Arslan**
- Website: [yukselarslan.com](https://yukselarslan.com)
- GitHub: [@yuksel-arslan](https://github.com/yuksel-arslan)

---

**Built with care by Yuksel Arslan**

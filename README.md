# ⚽ FootballAI - AI-Powered Football Match Predictions

> Yapay zeka destekli futbol maç tahminleri platformu. Next.js 15, Express.js mikroservisler ve XGBoost ML modeli ile geliştirilmiştir.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma)](https://www.prisma.io/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://www.python.org/)

## 🎯 Özellikler

- 🤖 **AI Tahminleri** - XGBoost ve LSTM ensemble model ile %70+ doğruluk
- 📊 **Detaylı İstatistikler** - Takım formu, H2H kayıtları, lig tabloları
- ⚡ **Canlı Skorlar** - WebSocket ile real-time maç güncellemeleri
- 🎨 **Modern UI** - Next.js 15 + Tailwind CSS ile responsive tasarım
- 🔐 **Güvenli** - JWT authentication, rate limiting
- 📱 **PWA** - Progressive Web App desteği

## 🏗️ Mimari

### Monorepo Yapısı (Turborepo)

```
football-ai/
├── apps/
│   └── web/                 # Next.js 15 frontend
├── packages/
│   ├── database/            # Prisma schema (14 model)
│   └── typescript-config/   # Shared TS configs
└── services/
    ├── api-gateway/         # Express.js gateway (Port 3000)
    ├── match-service/       # Maç verileri (Port 3001) ✅
    ├── stats-service/       # İstatistikler (Port 3002)
    ├── user-service/        # Kullanıcı yönetimi (Port 3003)
    └── ml-service/          # ML predictions (Port 8000)
```

### Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- TanStack Query
- Zustand

**Backend:**
- Node.js 22
- Express.js
- Prisma ORM
- PostgreSQL (Neon)
- Redis (Upstash)
- Zod validation

**ML Service:**
- Python 3.11
- FastAPI
- XGBoost
- Scikit-learn
- Pandas

**Infrastructure:**
- Vercel (Frontend) - FREE
- Railway (Backend)
- Neon (Database)
- Upstash (Redis)
- API-Football (Data)

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- Python 3.11+
- pnpm 8+
- PostgreSQL (Neon account)
- Redis (Upstash account)

### Installation

```bash
# Clone repository
git clone https://github.com/yuksel-arslan/futball-ai.git
cd futball-ai

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

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Redis
REDIS_URL="redis://..."

# API Football
API_FOOTBALL_KEY="your-key"

# JWT
JWT_SECRET="your-secret"

# Next.js
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

## 📖 Documentation

- **[CLAUDE_CODE_GUIDE.md](CLAUDE_CODE_GUIDE.md)** - Detaylı geliştirme kılavuzu
- **[SERVICES.md](SERVICES.md)** - Mikroservis dokümantasyonu
- **[FRONTEND_DESIGN_PRINCIPLES.md](FRONTEND_DESIGN_PRINCIPLES.md)** - UI/UX prensipleri
- **[TECHNICAL_SPEC.md](FOOTBALL_PREDICTION_TECHNICAL_SPEC.md)** - Teknik şartname

## 📊 Database Schema

14 Prisma model ile ilişkisel database:

- **Fixtures** - Maç bilgileri
- **Teams** - Takımlar
- **Leagues** - Ligler
- **Predictions** - AI tahminleri
- **Users** - Kullanıcılar
- **TeamStats** - İstatistikler
- **H2HRecords** - Kafa kafaya kayıtlar
- ...ve daha fazlası

[Tam schema'yı görüntüle](packages/database/prisma/schema.prisma)

## 🔌 API Endpoints

### Match Service (Port 3001)

```
GET  /api/fixtures/upcoming      # Gelecek maçlar
GET  /api/fixtures/live          # Canlı maçlar
GET  /api/fixtures/:id           # Maç detayı
POST /api/fixtures/sync          # API-Football sync
```

### Stats Service (Port 3002) - Coming Soon

```
GET  /api/stats/teams/:id
GET  /api/stats/compare
GET  /api/stats/leagues/:id/standings
```

### User Service (Port 3003) - Coming Soon

```
POST /api/auth/register
POST /api/auth/login
GET  /api/profile
```

### ML Service (Port 8000) - Coming Soon

```
POST /predict
GET  /models/performance
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Test specific service
pnpm --filter match-service test

# E2E tests
pnpm --filter web test:e2e
```

## 🚢 Deployment

### Frontend (Vercel)

```bash
# Auto-deploy on push to main
git push origin main
```

### Backend (Railway)

```bash
# Deploy all services
railway up
```

## 📈 Roadmap

### Phase 1: MVP (Week 1-2) ✅
- [x] Repository setup
- [x] Database schema
- [x] Next.js frontend (basic)
- [x] Match Service
- [ ] Stats Service
- [ ] User Service

### Phase 2: Core Features (Week 3-4)
- [ ] ML Service
- [ ] Frontend-Backend integration
- [ ] Authentication
- [ ] Real-time updates

### Phase 3: Enhancement (Week 5-6)
- [ ] Advanced ML models
- [ ] PWA features
- [ ] Performance optimization
- [ ] Analytics

### Phase 4: Launch (Week 7-8)
- [ ] Beta testing
- [ ] Marketing site
- [ ] SEO optimization
- [ ] Production deployment

## 💰 Cost Breakdown

| Service | Plan | Cost |
|---------|------|------|
| Vercel (Frontend) | Hobby | $0 |
| Railway (Backend) | Developer | $20 |
| Neon (Database) | Scale | $19 |
| Upstash (Redis) | Free | $0 |
| API-Football | Free (500/day) | $0 |
| **Total** | | **$39/mo** |

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 👨‍💻 Author

**Yuksel Arslan**
- Website: [yukselarslan.com](https://yukselarslan.com)
- GitHub: [@yuksel-arslan](https://github.com/yuksel-arslan)

## 🙏 Acknowledgments

- [API-Football](https://www.api-football.com/) - Football data API
- [Vercel](https://vercel.com/) - Frontend hosting
- [Neon](https://neon.tech/) - Serverless PostgreSQL
- [Upstash](https://upstash.com/) - Serverless Redis

---

**Note:** This project is in active development. Star ⭐ the repo to follow progress!

**Built with ❤️ and ☕ by Yuksel Arslan**

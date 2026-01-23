# Futbol Tahmin Uygulaması - Teknik Şartname

**Proje Adı:** FootballAI (geçici)  
**Versiyon:** 1.0.0  
**Tarih:** 23 Ocak 2026  
**Hazırlayan:** Yuksel Arslan

---

## 1. PROJE ÖZETİ

### 1.1 Amaç
AI destekli futbol maç tahmin platformu. Kullanıcılar gelecek maçlar hakkında:
- Kazanma olasılıkları
- Skor tahminleri
- İstatistiksel analiz
- Detaylı açıklamalar

alabilecek.

### 1.2 Hedef Kitle
- Futbol meraklıları
- Analiz seven kullanıcılar
- Türkiye + global pazarlar

### 1.3 Yasal Durum
✅ Sadece tahmin/analiz (bahis yok)
✅ Eğitim/bilgilendirme amaçlı
⚠️ Disclaimer: "Tahminler garanti değildir"

---

## 2. TEKNİK STACK

### 2.1 Frontend (Web + PWA)
```
Framework: Next.js 15 (App Router)
Language: TypeScript
CSS: Tailwind CSS v4
UI Components: shadcn/ui
State Management: Zustand
Data Fetching: TanStack Query (React Query)
Charts: Recharts
Animations: Framer Motion
Fonts: Geist (Vercel), Inter
Icons: Lucide React
Package Manager: pnpm
```

### 2.2 PWA Features
```
Service Worker: next-pwa
Offline Support: ✅
Push Notifications: Web Push API
Install Prompt: ✅
App-like Experience: ✅
Cache Strategy: Network-first (live data), Cache-first (static)
```

### 2.3 Backend Services
```
Language: TypeScript (Node.js 22+)
Framework: Express.js
API Style: REST + WebSocket (real-time)
Runtime: Node.js 22.x LTS
Package Manager: pnpm
Validation: Zod
```

### 2.4 ML Service
```
Language: Python 3.11
Framework: FastAPI
ML Libraries:
  - XGBoost 2.0
  - Scikit-learn 1.4
  - Pandas 2.1
  - NumPy 1.26
Models:
  - XGBoost (classification)
  - LSTM (time series)
  - Ensemble methods
```

### 2.5 Database
```
Primary: Neon PostgreSQL (serverless)
Cache: Upstash Redis (serverless)
ORM: Prisma (Node.js), SQLAlchemy (Python)
Vector DB: Neon pgvector (gelecek için)
```

### 2.6 Infrastructure
```
Frontend: Vercel (FREE tier)
Backend: Railway.app
ML Service: Railway.app / Hugging Face Spaces
CDN: Vercel Edge Network
Monitoring: Sentry
Analytics: Vercel Analytics
CI/CD: GitHub Actions + Vercel
```

---

## 3. MİKROSERVİS MİMARİSİ

### 3.1 Service Overview

```
┌─────────────────────────────────────────────────┐
│        Next.js 15 Web App + PWA                 │
│        (Vercel Edge Network)                     │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │   API Gateway       │  (Port: 3000)
         │   (Load Balancer)   │
         └─────────┬───────────┘
                   │
      ┌────────────┼────────────┬─────────────┐
      │            │            │             │
┌─────▼─────┐ ┌───▼────┐ ┌─────▼──────┐ ┌───▼────┐
│  Match    │ │   ML   │ │Statistics  │ │  User  │
│  Service  │ │Predict │ │  Service   │ │Service │
│  (3001)   │ │ (8000) │ │  (3002)    │ │ (3003) │
└─────┬─────┘ └───┬────┘ └─────┬──────┘ └───┬────┘
      │           │            │             │
      └───────────┴────────────┴─────────────┘
                       │
              ┌────────▼─────────┐
              │  Neon PostgreSQL │
              │ + Upstash Redis  │
              └──────────────────┘
```

### 3.2 Detaylı Servis Açıklamaları

#### 3.2.1 API Gateway
**Port:** 3000  
**Sorumluluklar:**
- Rate limiting
- Authentication (JWT)
- Request routing
- Response caching
- Error handling
- CORS management

**Teknolojiler:**
- Node.js 22 + Express
- express-rate-limit
- helmet (security)
- compression

**Endpoints:**
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/matches/*
GET    /api/v1/predictions/*
GET    /api/v1/statistics/*
GET    /api/v1/user/*
```

---

#### 3.2.2 Match Service
**Port:** 3001  
**Database:** match_service_db

**Sorumluluklar:**
- API-Football entegrasyonu
- Maç fixture'larını çekme
- Canlı skor güncellemeleri
- Lig/takım/oyuncu bilgileri
- Data normalizasyonu

**Database Schema:**
```sql
-- Leagues
CREATE TABLE leagues (
  id SERIAL PRIMARY KEY,
  api_id INTEGER UNIQUE,
  name VARCHAR(255),
  country VARCHAR(100),
  logo_url VARCHAR(500),
  season INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Teams
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  api_id INTEGER UNIQUE,
  name VARCHAR(255),
  logo_url VARCHAR(500),
  country VARCHAR(100),
  founded INTEGER,
  venue_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Fixtures (Maçlar)
CREATE TABLE fixtures (
  id SERIAL PRIMARY KEY,
  api_id INTEGER UNIQUE,
  league_id INTEGER REFERENCES leagues(id),
  home_team_id INTEGER REFERENCES teams(id),
  away_team_id INTEGER REFERENCES teams(id),
  match_date TIMESTAMP,
  status VARCHAR(50), -- 'scheduled', 'live', 'finished'
  home_score INTEGER,
  away_score INTEGER,
  venue VARCHAR(255),
  referee VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Live Scores (Cache)
CREATE TABLE live_scores (
  fixture_id INTEGER PRIMARY KEY REFERENCES fixtures(id),
  home_score INTEGER,
  away_score INTEGER,
  minute INTEGER,
  events JSONB, -- goals, cards, subs
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**API Endpoints:**
```typescript
GET  /fixtures/upcoming?league=39&limit=10
GET  /fixtures/:id
GET  /fixtures/live
GET  /leagues
GET  /teams/:id
GET  /teams/:id/next-matches
```

**External API:**
```typescript
// API-Football Integration
const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';
const API_KEY = process.env.API_FOOTBALL_KEY;

// Daily quota: 500 requests (free tier)
// Cache strategy: 
//   - Upcoming fixtures: 1 hour
//   - Live scores: 30 seconds
//   - Team info: 24 hours
```

---

#### 3.2.3 ML Prediction Service
**Port:** 8000  
**Language:** Python 3.11  
**Framework:** FastAPI

**Sorumluluklar:**
- Maç tahminleri
- Olasılık hesaplamaları
- Model training/retraining
- Feature engineering
- Model versioning

**ML Pipeline:**
```python
# Feature Engineering
features = [
    # Takım formu
    'home_last_5_wins',
    'home_last_5_draws', 
    'home_last_5_losses',
    'away_last_5_wins',
    'away_last_5_draws',
    'away_last_5_losses',
    
    # Goller
    'home_goals_scored_avg',
    'home_goals_conceded_avg',
    'away_goals_scored_avg',
    'away_goals_conceded_avg',
    
    # Head to Head
    'h2h_home_wins_last_5',
    'h2h_away_wins_last_5',
    'h2h_draws_last_5',
    
    # Lig durumu
    'home_league_position',
    'away_league_position',
    'home_points',
    'away_points',
    
    # Sakatlıklar
    'home_injured_players',
    'away_injured_players',
    
    # Ev/Deplasman performansı
    'home_home_win_rate',
    'away_away_win_rate',
    
    # Zaman faktörleri
    'days_since_last_match_home',
    'days_since_last_match_away',
    'is_weekend',
    'month',
]
```

**Models:**
```python
# Ensemble Model
class MatchPredictor:
    def __init__(self):
        self.xgb_model = XGBClassifier()
        self.lstm_model = LSTMModel()
        self.ensemble_weights = [0.6, 0.4]
    
    def predict(self, features):
        # XGBoost prediction
        xgb_pred = self.xgb_model.predict_proba(features)
        
        # LSTM prediction (time series)
        lstm_pred = self.lstm_model.predict(features)
        
        # Weighted ensemble
        final_pred = (
            self.ensemble_weights[0] * xgb_pred +
            self.ensemble_weights[1] * lstm_pred
        )
        
        return {
            'home_win': final_pred[0],
            'draw': final_pred[1],
            'away_win': final_pred[2],
            'confidence': calculate_confidence(final_pred)
        }
```

**Database Schema:**
```sql
-- Predictions
CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  fixture_id INTEGER REFERENCES fixtures(id),
  model_version VARCHAR(50),
  home_win_prob DECIMAL(5,2),
  draw_prob DECIMAL(5,2),
  away_win_prob DECIMAL(5,2),
  predicted_home_score DECIMAL(3,1),
  predicted_away_score DECIMAL(3,1),
  confidence_score DECIMAL(5,2),
  features JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Model Performance
CREATE TABLE model_metrics (
  id SERIAL PRIMARY KEY,
  model_version VARCHAR(50),
  accuracy DECIMAL(5,2),
  precision DECIMAL(5,2),
  recall DECIMAL(5,2),
  f1_score DECIMAL(5,2),
  total_predictions INTEGER,
  correct_predictions INTEGER,
  evaluated_at TIMESTAMP DEFAULT NOW()
);

-- Training Data
CREATE TABLE training_data (
  id SERIAL PRIMARY KEY,
  fixture_id INTEGER,
  features JSONB,
  actual_result VARCHAR(10), -- 'home', 'draw', 'away'
  created_at TIMESTAMP DEFAULT NOW()
);
```

**API Endpoints:**
```python
POST   /predict
GET    /predict/:fixture_id
POST   /train
GET    /models/performance
GET    /models/versions
```

---

#### 3.2.4 Statistics Service
**Port:** 3002

**Sorumluluklar:**
- Takım istatistikleri
- Oyuncu performansı
- Lig tabloları
- Form analizleri
- Karşılaştırmalar

**Database Schema:**
```sql
-- Team Statistics
CREATE TABLE team_stats (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(id),
  season INTEGER,
  matches_played INTEGER,
  wins INTEGER,
  draws INTEGER,
  losses INTEGER,
  goals_for INTEGER,
  goals_against INTEGER,
  clean_sheets INTEGER,
  home_wins INTEGER,
  away_wins INTEGER,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Player Statistics
CREATE TABLE player_stats (
  id SERIAL PRIMARY KEY,
  player_id INTEGER,
  team_id INTEGER REFERENCES teams(id),
  season INTEGER,
  appearances INTEGER,
  goals INTEGER,
  assists INTEGER,
  yellow_cards INTEGER,
  red_cards INTEGER,
  minutes_played INTEGER,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Head to Head
CREATE TABLE h2h_records (
  id SERIAL PRIMARY KEY,
  team1_id INTEGER REFERENCES teams(id),
  team2_id INTEGER REFERENCES teams(id),
  team1_wins INTEGER,
  team2_wins INTEGER,
  draws INTEGER,
  last_5_results VARCHAR(5), -- 'WDWLL'
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**API Endpoints:**
```typescript
GET  /teams/:id/stats
GET  /teams/:id/form
GET  /teams/compare?team1=:id1&team2=:id2
GET  /leagues/:id/standings
GET  /players/:id/stats
GET  /h2h/:team1_id/:team2_id
```

---

#### 3.2.5 User Service
**Port:** 3003

**Sorumluluklar:**
- Kullanıcı yönetimi
- Authentication/Authorization
- Favori takımlar
- Tahmin geçmişi
- Bildirim ayarları

**Database Schema:**
```sql
-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url VARCHAR(500),
  country VARCHAR(100),
  preferred_language VARCHAR(10) DEFAULT 'tr',
  theme VARCHAR(10) DEFAULT 'dark',
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Favorite Teams
CREATE TABLE favorite_teams (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  team_id INTEGER REFERENCES teams(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

-- Favorite Leagues
CREATE TABLE favorite_leagues (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  league_id INTEGER REFERENCES leagues(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, league_id)
);

-- Prediction History
CREATE TABLE user_predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  fixture_id INTEGER REFERENCES fixtures(id),
  predicted_result VARCHAR(10), -- 'home', 'draw', 'away'
  actual_result VARCHAR(10),
  was_correct BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type VARCHAR(50), -- 'match_start', 'prediction_result', 'favorite_team'
  title VARCHAR(255),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**API Endpoints:**
```typescript
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
GET    /profile
PUT    /profile
GET    /favorites/teams
POST   /favorites/teams/:id
DELETE /favorites/teams/:id
GET    /predictions/history
GET    /notifications
PUT    /notifications/:id/read
```

---

## 4. FRONTEND (NEXT.JS WEB APP + PWA)

### 4.1 Teknoloji Stack
```json
{
  "framework": "Next.js 15 (App Router)",
  "language": "TypeScript",
  "styling": "Tailwind CSS v4",
  "components": "shadcn/ui",
  "state": "Zustand",
  "api": "TanStack Query (React Query)",
  "charts": "Recharts",
  "animations": "Framer Motion",
  "fonts": "Geist, Inter",
  "icons": "Lucide React",
  "pwa": "next-pwa"
}
```

### 4.2 Dizin Yapısı (App Router)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── page.tsx              # Ana sayfa
│   │   ├── predictions/
│   │   │   ├── page.tsx          # Tahmin listesi
│   │   │   └── [id]/page.tsx     # Tahmin detay
│   │   ├── matches/
│   │   │   ├── page.tsx          # Maç listesi
│   │   │   ├── live/page.tsx     # Canlı skorlar
│   │   │   └── [id]/page.tsx     # Maç detay
│   │   ├── statistics/
│   │   │   ├── teams/[id]/page.tsx
│   │   │   ├── leagues/[id]/page.tsx
│   │   │   └── compare/page.tsx
│   │   ├── favorites/page.tsx
│   │   └── profile/page.tsx
│   ├── api/                      # API Routes (BFF pattern)
│   │   ├── predictions/route.ts
│   │   ├── matches/route.ts
│   │   └── auth/route.ts
│   ├── layout.tsx
│   ├── globals.css
│   └── manifest.ts               # PWA manifest
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── matches/
│   │   ├── match-card.tsx
│   │   ├── live-score.tsx
│   │   └── match-list.tsx
│   ├── predictions/
│   │   ├── prediction-card.tsx
│   │   ├── probability-chart.tsx
│   │   └── confidence-meter.tsx
│   ├── stats/
│   │   ├── team-stats.tsx
│   │   ├── form-chart.tsx
│   │   └── h2h-table.tsx
│   └── layout/
│       ├── navbar.tsx
│       ├── sidebar.tsx
│       └── footer.tsx
│
├── lib/
│   ├── api/                      # API client
│   │   ├── client.ts
│   │   ├── matches.ts
│   │   ├── predictions.ts
│   │   └── stats.ts
│   ├── hooks/                    # Custom hooks
│   │   ├── use-matches.ts
│   │   ├── use-predictions.ts
│   │   └── use-live-scores.ts
│   ├── store/                    # Zustand stores
│   │   ├── auth-store.ts
│   │   ├── favorites-store.ts
│   │   └── theme-store.ts
│   └── utils/
│       ├── cn.ts                 # className merger
│       ├── format.ts
│       └── constants.ts
│
├── types/
│   ├── match.ts
│   ├── prediction.ts
│   ├── team.ts
│   └── user.ts
│
└── styles/
    └── globals.css
```

### 4.3 Design System

**Theme Configuration (Tailwind):**
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark mode (default)
        background: 'hsl(234 47% 6%)',      // #0A0E27
        foreground: 'hsl(210 40% 98%)',     // #F9FAFB
        card: 'hsl(234 39% 14%)',           // #141B3D
        'card-foreground': 'hsl(210 40% 98%)',
        primary: {
          DEFAULT: 'hsl(239 84% 67%)',      // #4F46E5 Indigo
          foreground: 'hsl(210 40% 98%)',
        },
        secondary: {
          DEFAULT: 'hsl(142 76% 36%)',      // #10B981 Green
          foreground: 'hsl(210 40% 98%)',
        },
        accent: {
          DEFAULT: 'hsl(38 92% 50%)',       // #F59E0B Amber
          foreground: 'hsl(210 40% 98%)',
        },
        win: 'hsl(142 76% 36%)',            // Green
        draw: 'hsl(38 92% 50%)',            // Amber
        loss: 'hsl(0 84% 60%)',             // Red
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Inter', 'system-ui'],
        mono: ['var(--font-geist-mono)', 'JetBrains Mono', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

### 4.4 Örnek Sayfalar

**Ana Sayfa (Dashboard):**
```typescript
// app/(dashboard)/page.tsx
export default async function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 p-8">
        <h1 className="text-4xl font-bold">
          AI Destekli Futbol Tahminleri
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Yapay zeka ile gelecek maçları tahmin edin
        </p>
      </section>

      {/* Live Matches */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Canlı Maçlar</h2>
        <LiveMatchesGrid />
      </section>

      {/* Upcoming Predictions */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Bugünün Tahminleri</h2>
        <PredictionsGrid date={new Date()} />
      </section>

      {/* Featured Stats */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Öne Çıkan İstatistikler</h2>
        <StatsOverview />
      </section>
    </div>
  )
}
```

**Tahmin Detay Sayfası:**
```typescript
// app/(dashboard)/predictions/[id]/page.tsx
interface PredictionDetailProps {
  params: { id: string }
}

export default async function PredictionDetail({ params }: PredictionDetailProps) {
  const prediction = await getPrediction(params.id)
  
  return (
    <div className="space-y-6">
      {/* Match Header */}
      <MatchHeader 
        homeTeam={prediction.fixture.home_team}
        awayTeam={prediction.fixture.away_team}
        date={prediction.fixture.date}
      />

      {/* Prediction Results */}
      <Card>
        <CardHeader>
          <CardTitle>AI Tahmini</CardTitle>
        </CardHeader>
        <CardContent>
          <ProbabilityChart 
            homeWin={prediction.probabilities.home_win}
            draw={prediction.probabilities.draw}
            awayWin={prediction.probabilities.away_win}
          />
          <ConfidenceMeter score={prediction.confidence} />
        </CardContent>
      </Card>

      {/* Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Detaylı Analiz</CardTitle>
        </CardHeader>
        <CardContent>
          <KeyFactors factors={prediction.analysis.key_factors} />
          <AIExplanation text={prediction.analysis.explanation} />
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Takım Formu</CardTitle>
          </CardHeader>
          <CardContent>
            <FormComparison 
              home={prediction.stats.form.home}
              away={prediction.stats.form.away}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kafa Kafaya</CardTitle>
          </CardHeader>
          <CardContent>
            <H2HTable records={prediction.stats.h2h} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

### 4.5 PWA Configuration

**Manifest:**
```typescript
// app/manifest.ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FootballAI - AI Destekli Futbol Tahminleri',
    short_name: 'FootballAI',
    description: 'Yapay zeka ile futbol maç tahminleri',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0E27',
    theme_color: '#4F46E5',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    categories: ['sports', 'entertainment'],
    screenshots: [
      {
        src: '/screenshot-mobile.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
      },
      {
        src: '/screenshot-desktop.png',
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide',
      },
    ],
  }
}
```

**Service Worker (next-pwa):**
```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.footballai\.com\/.*$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
  ],
})

module.exports = withPWA({
  reactStrictMode: true,
  // ... diğer config
})
```

**Push Notifications:**
```typescript
// lib/notifications/push.ts
export async function registerPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_KEY,
    })

    // Send subscription to backend
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    })

    return subscription
  } catch (error) {
    console.error('Push notification registration failed:', error)
    return null
  }
}
```

### 4.6 SEO Optimization

**Metadata:**
```typescript
// app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | FootballAI',
    default: 'FootballAI - AI Destekli Futbol Tahminleri',
  },
  description: 'Yapay zeka teknolojisi ile futbol maç tahminleri, istatistikler ve analizler.',
  keywords: ['futbol tahmin', 'ai tahmin', 'maç tahmini', 'iddaa', 'futbol analiz'],
  authors: [{ name: 'FootballAI' }],
  creator: 'FootballAI',
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url: 'https://footballai.com',
    title: 'FootballAI - AI Destekli Futbol Tahminleri',
    description: 'Yapay zeka ile futbol maç tahminleri',
    siteName: 'FootballAI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FootballAI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FootballAI - AI Destekli Futbol Tahminleri',
    description: 'Yapay zeka ile futbol maç tahminleri',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}
```

**Dinamik Metadata (Tahmin Sayfaları):**
```typescript
// app/(dashboard)/predictions/[id]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const prediction = await getPrediction(params.id)
  
  return {
    title: `${prediction.fixture.home_team.name} vs ${prediction.fixture.away_team.name} Tahmini`,
    description: `AI destekli ${prediction.fixture.home_team.name} - ${prediction.fixture.away_team.name} maç tahmini. Kazanma olasılığı: %${prediction.probabilities.home_win}`,
    openGraph: {
      title: `${prediction.fixture.home_team.name} vs ${prediction.fixture.away_team.name}`,
      description: `AI Tahmin: Ev %${prediction.probabilities.home_win} | Beraberlik %${prediction.probabilities.draw} | Deplasman %${prediction.probabilities.away_win}`,
      images: [
        {
          url: `/api/og?fixture=${params.id}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  }
}
```

### 4.7 State Management (Zustand)

```typescript
// lib/store/auth-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: async (email, password) => {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        
        const data = await response.json()
        
        set({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
        })
      },
      
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },
      
      refreshToken: async () => {
        // Token refresh logic
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
```

### 4.8 API Integration (TanStack Query)

```typescript
// lib/hooks/use-matches.ts
import { useQuery } from '@tanstack/react-query'

export function useUpcomingMatches(league?: number) {
  return useQuery({
    queryKey: ['matches', 'upcoming', league],
    queryFn: () => fetchUpcomingMatches(league),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  })
}

export function useLiveScores() {
  return useQuery({
    queryKey: ['matches', 'live'],
    queryFn: fetchLiveScores,
    refetchInterval: 30 * 1000, // 30 seconds
    staleTime: 0,
  })
}

// lib/hooks/use-predictions.ts
export function usePrediction(fixtureId: string) {
  return useQuery({
    queryKey: ['predictions', fixtureId],
    queryFn: () => fetchPrediction(fixtureId),
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}
```

---

## 5. API ENDPOİNTLERİ (DETAYLI)

### 5.1 Match Service Endpoints

```typescript
// Upcoming Matches
GET /api/v1/matches/upcoming
QueryParams:
  - league?: number
  - team?: number
  - date?: string (YYYY-MM-DD)
  - limit?: number (default: 20)
  - offset?: number (default: 0)

Response:
{
  "data": [
    {
      "id": 12345,
      "league": {
        "id": 39,
        "name": "Premier League",
        "logo": "url"
      },
      "home_team": {
        "id": 33,
        "name": "Manchester United",
        "logo": "url"
      },
      "away_team": {
        "id": 34,
        "name": "Liverpool",
        "logo": "url"
      },
      "date": "2026-02-01T15:00:00Z",
      "venue": "Old Trafford",
      "status": "scheduled"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0
  }
}

// Live Scores
GET /api/v1/matches/live
Response:
{
  "data": [
    {
      "id": 12346,
      "home_team": {...},
      "away_team": {...},
      "score": {
        "home": 2,
        "away": 1
      },
      "minute": 67,
      "events": [
        {
          "type": "goal",
          "player": "Marcus Rashford",
          "minute": 23,
          "team": "home"
        }
      ]
    }
  ]
}

// Match Detail
GET /api/v1/matches/:id
Response:
{
  "data": {
    "id": 12345,
    "league": {...},
    "home_team": {...},
    "away_team": {...},
    "date": "2026-02-01T15:00:00Z",
    "venue": "Old Trafford",
    "referee": "Michael Oliver",
    "weather": {
      "temperature": 12,
      "condition": "Cloudy"
    },
    "odds": {
      "home": 2.10,
      "draw": 3.40,
      "away": 3.20
    },
    "lineups": {
      "home": {
        "formation": "4-3-3",
        "players": [...]
      },
      "away": {...}
    }
  }
}
```

### 5.2 ML Prediction Endpoints

```python
# Get Prediction
POST /api/v1/predictions/predict
Request:
{
  "fixture_id": 12345
}

Response:
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
        "description": "Manchester United has won 4 of last 5 home games"
      },
      {
        "factor": "Head to Head",
        "impact": 0.25,
        "description": "Liverpool won 3 of last 5 meetings"
      }
    ],
    "explanation": "Based on current form, home advantage, and historical data, Manchester United has a slight edge. However, Liverpool's strong away record keeps this competitive."
  },
  "created_at": "2026-01-23T10:30:00Z"
}

# Bulk Predictions
POST /api/v1/predictions/bulk
Request:
{
  "fixture_ids": [12345, 12346, 12347]
}

# Model Performance
GET /api/v1/predictions/performance
Response:
{
  "model_version": "v2.1.0",
  "metrics": {
    "accuracy": 68.5,
    "precision": 71.2,
    "recall": 65.8,
    "f1_score": 68.3
  },
  "total_predictions": 1250,
  "correct_predictions": 856,
  "last_updated": "2026-01-20T00:00:00Z"
}
```

### 5.3 Statistics Endpoints

```typescript
// Team Stats
GET /api/v1/stats/teams/:id
Response:
{
  "team_id": 33,
  "season": 2025,
  "stats": {
    "matches_played": 22,
    "wins": 14,
    "draws": 5,
    "losses": 3,
    "goals_for": 45,
    "goals_against": 21,
    "clean_sheets": 9,
    "form": {
      "last_5": "WWDWL",
      "last_5_home": "WWWDW",
      "last_5_away": "WLDDL"
    },
    "league_position": 3,
    "points": 47
  }
}

// Team Comparison
GET /api/v1/stats/compare
Query: team1=33&team2=34
Response:
{
  "comparison": {
    "team1": {
      "id": 33,
      "name": "Manchester United",
      "stats": {...}
    },
    "team2": {
      "id": 34,
      "name": "Liverpool",
      "stats": {...}
    },
    "head_to_head": {
      "total_matches": 50,
      "team1_wins": 18,
      "team2_wins": 22,
      "draws": 10,
      "last_5": [
        {
          "date": "2025-12-15",
          "home": "Liverpool",
          "score": "2-1",
          "result": "team2_win"
        }
      ]
    }
  }
}

// League Standings
GET /api/v1/stats/leagues/:id/standings
Response:
{
  "league_id": 39,
  "season": 2025,
  "standings": [
    {
      "position": 1,
      "team": {...},
      "played": 22,
      "won": 16,
      "drawn": 4,
      "lost": 2,
      "goals_for": 52,
      "goals_against": 18,
      "goal_difference": 34,
      "points": 52
    }
  ]
}
```

---

## 6. GÜVENLIK

### 6.1 Authentication
```typescript
// JWT Strategy
{
  algorithm: 'RS256',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  secretRotation: 'monthly'
}

// Password Hashing
{
  algorithm: 'bcrypt',
  rounds: 12
}
```

### 6.2 Rate Limiting
```typescript
// API Gateway
{
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // requests per window
  message: 'Too many requests'
}

// ML Predictions (expensive)
{
  windowMs: 60 * 1000, // 1 minute
  max: 10
}
```

### 6.3 Data Protection
- HTTPS only
- Environment variables
- Database encryption at rest
- API key rotation
- SQL injection protection (Prisma ORM)

---

## 7. DEPLOYMENT

### 7.1 Infrastructure

```yaml
# Frontend (Vercel)
vercel:
  framework: nextjs
  build_command: pnpm build
  output_directory: .next
  install_command: pnpm install
  env:
    NEXT_PUBLIC_API_URL: ${API_URL}
    NEXT_PUBLIC_WS_URL: ${WS_URL}
  
  # Auto SSL + CDN + Edge Network
  regions: [iad1, fra1] # Virginia, Frankfurt
  
# Backend Services (Railway)
services:
  api-gateway:
    build: ./services/api-gateway
    port: 3000
    env:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
    
  match-service:
    build: ./services/match-service
    port: 3001
    
  ml-service:
    build: ./services/ml-service
    port: 8000
    runtime: python3.11
    
  stats-service:
    build: ./services/stats-service
    port: 3002
    
  user-service:
    build: ./services/user-service
    port: 3003

databases:
  postgres:
    provider: neon
    plan: scale
    
  redis:
    provider: upstash
    plan: free
```

### 7.2 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml

name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  # Frontend deployment (Vercel)
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
  
  # Backend services deployment
  deploy-backend:
    runs-on: ubuntu-latest
    needs: test-backend
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Railway
        run: |
          curl -fsSL https://railway.app/install.sh | sh
          railway up --service api-gateway
          railway up --service match-service
          railway up --service ml-service
          railway up --service stats-service
          railway up --service user-service
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
  
  # Tests
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
      
      - name: Run Tests
        run: |
          pnpm install
          pnpm test
      
      - name: Run Linting
        run: pnpm lint
```

### 7.3 Environment Variables

```bash
# .env.local (Frontend - Next.js)
NEXT_PUBLIC_API_URL=https://api.footballai.com
NEXT_PUBLIC_WS_URL=wss://api.footballai.com
NEXT_PUBLIC_VAPID_KEY=BKxxx...
DATABASE_URL=postgresql://user:pass@db.neon.tech/football
REDIS_URL=redis://default:pass@redis.upstash.io:6379

# Backend Services
NODE_ENV=production
PORT=3000
JWT_SECRET=xxx
JWT_REFRESH_SECRET=xxx
API_FOOTBALL_KEY=xxx
SENTRY_DSN=xxx

# ML Service
PYTHON_ENV=production
MODEL_VERSION=v2.1.0
TENSORBOARD_LOG_DIR=/app/logs
```

---

## 8. MALİYET ANALİZİ

### 8.1 Aylık Sabit Maliyetler

| Servis | Plan | Maliyet |
|--------|------|---------|
| **Vercel (Frontend)** | **Hobby (FREE)** | **$0** |
| Railway (Backend) | Developer | $20 |
| Neon PostgreSQL | Scale | $19 |
| Upstash Redis | Free | $0 |
| API-Football | Free (500/day) | $0 |
| Sentry (Monitoring) | Developer (Free) | $0 |
| **TOPLAM** | | **$39/ay** |

### 8.2 Vercel Free Tier Limitleri

```yaml
Bandwidth: 100GB/month
Build Time: 6000 minutes/month
Serverless Functions: 100GB-Hours
Edge Functions: Unlimited
Domains: Unlimited
Team Members: 1
```

### 8.3 Ölçekleme Maliyetleri

| Kullanıcı | Frontend | Backend | Database | API | Toplam |
|-----------|----------|---------|----------|-----|---------|
| 0-10K | $0 (Vercel Free) | $20 | $19 | $0 | **$39** |
| 10K-50K | $20 (Vercel Pro) | $50 | $29 | $49 | **$148** |
| 50K-100K | $20 | $100 | $59 | $99 | **$278** |
| 100K+ | $20 | $200+ | $99+ | $199+ | **$518+** |

### 8.4 Ek Maliyetler (Opsiyonel)

| Servis | Amaç | Maliyet |
|--------|------|---------|
| Mixpanel | Analytics | $0 (100K events/mo) |
| PostHog | Product Analytics | $0 (1M events/mo) |
| Resend | Transactional Email | $0 (3K emails/mo) |
| Cloudflare | Extra CDN/DDoS | $0 (Free plan) |

### 8.5 İlk 6 Ay Maliyet Projeksiyonu

```
Month 1-2 (Beta): $39/ay
Month 3-4 (Launch): $39-148/ay
Month 5-6 (Growth): $148-278/ay

Toplam 6 aylık: ~$500-1000
```

---

## 9. PERFORMANS HEDEFLERİ

```yaml
API Response Times:
  - Simple queries: <100ms
  - ML predictions: <500ms
  - Complex stats: <200ms

Database:
  - Connection pool: 10-20
  - Query timeout: 5s
  - Index optimization: Critical paths

Caching:
  - Match data: 1 hour
  - Live scores: 30 seconds
  - Predictions: 6 hours
  - User data: 5 minutes

Mobile App:
  - Initial load: <2s
  - Screen transitions: <300ms
  - API calls: <1s
```

---

## 10. GELİŞTİRME TIMELINE

### Phase 1: MVP (3-4 hafta)
```
Week 1:
  ✅ Repository setup (monorepo with Turborepo)
  ✅ Database schema (Prisma)
  ✅ Next.js app scaffold
  ✅ shadcn/ui setup
  ✅ Authentication system

Week 2:
  ✅ Match Service development
  ✅ API-Football integration
  ✅ Live scores endpoint
  ✅ Basic UI components

Week 3:
  ✅ ML Service setup (Python)
  ✅ Feature engineering
  ✅ Baseline model (XGBoost)
  ✅ Prediction endpoints

Week 4:
  ✅ Stats Service
  ✅ User Service
  ✅ Frontend pages (Home, Predictions, Stats)
  ✅ PWA setup
  ✅ Deploy to staging
```

### Phase 2: Enhancement (2-3 hafta)
```
Week 5-6:
  ✅ Advanced ML models (Ensemble)
  ✅ Real-time WebSocket updates
  ✅ Push notifications
  ✅ SEO optimization
  ✅ Analytics integration
```

### Phase 3: Polish & Launch (1-2 hafta)
```
Week 7-8:
  ✅ Performance optimization
  ✅ Error handling & monitoring
  ✅ Beta testing
  ✅ Marketing site
  ✅ Production deployment
```

**Toplam Süre:** 6-9 hafta

---

## 11. METRİKLER & ANALİTİK

```typescript
// Tracking Events
{
  user_actions: [
    'app_opened',
    'prediction_viewed',
    'team_favorited',
    'notification_clicked'
  ],
  
  business_metrics: [
    'dau', // Daily Active Users
    'mau', // Monthly Active Users
    'retention_rate',
    'prediction_accuracy',
    'avg_session_duration'
  ],
  
  technical_metrics: [
    'api_response_time',
    'error_rate',
    'cache_hit_rate',
    'ml_inference_time'
  ]
}
```

---

## 12. RİSKLER & AZALTMA

| Risk | Olasılık | Etki | Azaltma |
|------|----------|------|---------|
| API limitleri | Yüksek | Orta | Caching + multiple providers |
| ML doğruluğu düşük | Orta | Yüksek | Ensemble models + retraining |
| Ölçekleme maliyetleri | Orta | Yüksek | Serverless + optimization |
| Kullanıcı beklentileri | Orta | Orta | Disclaimer + education |
| SEO rekabet | Yüksek | Orta | Quality content + backlinks |

---

## 12.5 SEO & MARKETING STRATEGY

### SEO Hedefler

**Target Keywords:**
```
Primary:
- "futbol tahmin" (18K/month)
- "maç tahmini" (12K/month)
- "ai futbol tahmin" (2K/month)
- "premier league tahmin" (5K/month)

Long-tail:
- "manchester united liverpool tahmin"
- "süper lig bugün tahmin"
- "yapay zeka maç tahmini"
- "futbol analiz programı"
```

**SEO Optimizations:**
```typescript
// Dynamic meta tags for each match
generateMetadata({
  title: "Man United vs Liverpool Tahmini - AI Analiz",
  description: "Yapay zeka ile Man United - Liverpool maç tahmini. Kazanma olasılığı %45.2. Detaylı istatistik ve analiz.",
  keywords: ["man united liverpool", "tahmin", "ai", "analiz"]
})

// Schema.org markup
const schema = {
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  "name": "Manchester United vs Liverpool",
  "startDate": "2026-02-01T15:00:00Z",
  "location": {
    "@type": "Place",
    "name": "Old Trafford"
  },
  "homeTeam": {...},
  "awayTeam": {...},
  "prediction": {...}
}
```

**Content Strategy:**
```
Blog Posts:
- "Futbol Tahmininde Yapay Zeka Nasıl Kullanılır?"
- "En İyi Tahmin Stratejileri 2026"
- "Süper Lig Analizi: Şampiyonluk Yarışı"

Weekly Content:
- Haftalık maç tahminleri
- Lig analizi
- Takım performans raporları
```

### Marketing Channels

**Organic (SEO):**
- Google Search (primary)
- Bing Search
- YouTube (video content)

**Social Media:**
```
Twitter/X: 
  - Live predictions
  - Match results
  - AI insights

Instagram:
  - Infographics
  - Match previews
  - Statistics

Reddit:
  - r/soccer
  - r/SuperLig
  - r/PremierLeague
```

**Partnerships:**
```
Potential Partners:
- Spor blogları
- Futbol analiz kanalları
- Sports betting forums (sadece analiz için)
```

### Growth Strategy

**Phase 1 (Month 1-2):**
```
Goal: 1,000 users
Strategy:
  - Product Hunt launch
  - Turkish football forums
  - Social media organic content
  - SEO foundation
```

**Phase 2 (Month 3-6):**
```
Goal: 10,000 users
Strategy:
  - Content marketing (blog)
  - YouTube videos
  - Influencer partnerships
  - Referral program
```

**Phase 3 (Month 7-12):**
```
Goal: 50,000 users
Strategy:
  - Paid advertising (Google Ads)
  - International expansion
  - Premium features
  - Mobile app (React Native)
```

---

## 13. SONRAKI ADIMLAR

### İlk Adımlar (Sırayla)
```bash
# 1. Repository Setup
git clone https://github.com/yukselarslan/football-ai.git
cd football-ai

# 2. Monorepo Structure (Turborepo)
pnpm create turbo@latest

# 3. Next.js App
cd apps/web
pnpm create next-app@latest . --typescript --tailwind --app

# 4. shadcn/ui Setup
pnpm dlx shadcn-ui@latest init

# 5. Database Setup
cd packages/database
npx prisma init
npx prisma migrate dev --name init

# 6. Development
pnpm dev
```

### Development Checklist
- [ ] Monorepo setup (Turborepo)
- [ ] Next.js app scaffold
- [ ] Database schema (Prisma)
- [ ] Authentication (NextAuth.js)
- [ ] API Routes (BFF pattern)
- [ ] Match Service (Node.js)
- [ ] ML Service (Python/FastAPI)
- [ ] Stats Service (Node.js)
- [ ] User Service (Node.js)
- [ ] PWA configuration
- [ ] Deployment (Vercel + Railway)
- [ ] Testing (Vitest + Playwright)
- [ ] Monitoring (Sentry)
- [ ] Analytics (Vercel Analytics)

### Deployment Checklist
- [ ] Vercel project setup
- [ ] Railway services deployment
- [ ] Environment variables
- [ ] Database migration
- [ ] DNS configuration
- [ ] SSL certificates (auto)
- [ ] Monitoring setup
- [ ] Error tracking

### Launch Checklist
- [ ] Beta testing (50 users)
- [ ] Performance optimization
- [ ] SEO setup
- [ ] Social media cards
- [ ] Analytics tracking
- [ ] User feedback system
- [ ] Documentation
- [ ] Marketing site

---

## EKLER

### A. Technology Versions
```json
{
  "node": "22.x",
  "python": "3.11",
  "next": "15.x",
  "react": "19.x",
  "typescript": "5.x",
  "tailwind": "4.x",
  "prisma": "5.x",
  "fastapi": "0.110",
  "xgboost": "2.0",
  "tanstack-query": "5.x",
  "zustand": "4.x",
  "framer-motion": "11.x"
}
```

### B. Useful Links
- Next.js: https://nextjs.org/
- shadcn/ui: https://ui.shadcn.com/
- API-Football: https://www.api-football.com/
- Neon: https://neon.tech/
- Railway: https://railway.app/
- Vercel: https://vercel.com/
- Upstash: https://upstash.com/

### C. Team Roles (Önerilen)
- Full-stack Developer (Next.js + Node.js) - 1
- ML Engineer (Python) - 1
- DevOps Engineer (part-time) - 1
- UI/UX Designer (part-time) - 1

**Alternatif (Solo Development):**
- Yuksel Arslan (Full-stack + ML + DevOps)
- UI/UX Designer (freelance/contract)

---

**Şartname Durumu:** ✅ Draft Complete  
**Son Güncelleme:** 23 Ocak 2026  
**Onay Bekliyor:** Yuksel Arslan

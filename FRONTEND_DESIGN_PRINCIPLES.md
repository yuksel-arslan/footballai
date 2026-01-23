# Frontend Design Principles - FootballAI

**Felsefe:** Minimal ama Güçlü, Akıllı ama Basit

---

## TASARIM PRENSİPLERİ

### 1. Zero-Clutter Interface
```
✅ Her pixel değerli
✅ Gereksiz dekorasyon yok
✅ Her element bir amaca hizmet eder
✅ "Boşluk" da bir tasarım elementidir
```

### 2. Data-First Approach
```
Önce veri → Sonra tasarım
İstatistikler görsel ama minimal
Grafik varsa, gerçekten değer katsın
```

### 3. Smart Defaults
```
Kullanıcı seçim yapmasın
AI karar versin, kullanıcı override etsin
Favori takım varsa → otomatik filtrele
```

---

## SAYFA YAPISI (Minimal)

### Ana Yapı: 3 Sayfa Yeter

```
1. / (Ana Sayfa)
   - Tüm önemli bilgi burada
   - Tabs ile organize
   - İnfinite scroll

2. /match/[id] (Detay)
   - Tek maç deep-dive
   - Modal olarak açılabilir
   
3. /profile
   - Settings
   - Favorites
   - History
```

---

## ANA SAYFA TASARIMI

### Layout: Dashboard Style

```
┌─────────────────────────────────────────────────┐
│  🏠 FootballAI    🔍 Search    ⚙️ Settings      │ Header (sticky)
├─────────────────────────────────────────────────┤
│                                                  │
│  📊 Quick Stats (1 satır, scroll-able)          │
│  ┌────────┬────────┬────────┬────────┐         │
│  │ %72.5  │ 156    │ Live:3 │ Top:⚡ │         │
│  │Accuracy│Tahmin  │ Maçlar │ League │         │
│  └────────┴────────┴────────┴────────┘         │
│                                                  │
├─────────────────────────────────────────────────┤
│  🔥 Tabs (Akıllı Filtreler)                     │
│  [Tümü] [Canlı] [Bugün] [Yarın] [Favoriler]   │
├─────────────────────────────────────────────────┤
│                                                  │
│  📋 Match List (Compact Cards)                  │
│  ┌──────────────────────────────────┐          │
│  │ 15:00  Premier League             │          │
│  │ Man United  vs  Liverpool         │          │
│  │    45.2%    •    26.3%           │          │
│  │ [2-1]  🎯 72% confidence         │          │
│  └──────────────────────────────────┘          │
│                                                  │
│  ┌──────────────────────────────────┐          │
│  │ 17:30  La Liga                   │          │
│  │ Barcelona  vs  Real Madrid        │          │
│  │    52.1%    •    31.8%           │          │
│  │ [1-0]  🎯 68% confidence         │          │
│  └──────────────────────────────────┘          │
│                                                  │
│  [Load More...]                                 │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Akıllı Özellikler:

**1. Context-Aware Tabs**
```typescript
// Dinamik tab'lar
const tabs = [
  { id: 'all', label: 'Tümü', count: 156 },
  { id: 'live', label: '🔴 Canlı', count: 3, badge: 'pulse' },
  { id: 'today', label: 'Bugün', count: 24 },
  { id: 'tomorrow', label: 'Yarın', count: 31 },
  // Eğer kullanıcının favori takımları varsa
  { id: 'favorites', label: '⭐ Favorilerim', count: 8 },
  // Eğer kullanıcı Premier League takip ediyorsa
  { id: 'premier-league', label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 PL', count: 12 }
]
```

**2. Smart Search**
```typescript
// Tek input, her şeyi ara
<Search 
  placeholder="Takım, lig, tarih..."
  suggestions={[
    'Man United',
    'Premier League',
    'Bugün 15:00',
    'Barcelona vs Real Madrid'
  ]}
/>
```

**3. Compact Match Cards**
```typescript
// Minimal ama bilgi dolu
<MatchCard>
  <Time>15:00</Time>
  <League badge="mini">Premier League</League>
  
  <Teams>
    <Team logo="32x32">Man United</Team>
    <vs />
    <Team logo="32x32">Liverpool</Team>
  </Teams>
  
  <Prediction compact>
    <Probability team="home">45.2%</Probability>
    <Draw>28.5%</Draw>
    <Probability team="away">26.3%</Probability>
  </Prediction>
  
  <Score>2-1</Score>
  <Confidence>72%</Confidence>
</MatchCard>
```

---

## DETAY SAYFASI (Modal-First)

### Modal yaklaşımı (Hızlı)
```
Kullanıcı match card'a tıklar
→ Modal açılır (URL değişir: /match/12345)
→ Arka plan blur
→ Detaylı bilgi göster
→ ESC ile kapat → ana sayfaya dön
```

### Detay İçeriği (Tab-based)

```
┌─────────────────────────────────────────────────┐
│  ← Back                              [X] Close   │
├─────────────────────────────────────────────────┤
│                                                  │
│  Man United  🆚  Liverpool                      │
│  Old Trafford • 15:00 • 01 Feb 2026             │
│                                                  │
│  ┌─────────────────────────────────┐           │
│  │   AI Tahmini                     │           │
│  │                                  │           │
│  │        🏠 45.2%                  │           │
│  │        ⚪ 28.5%                  │           │
│  │        ✈️  26.3%                 │           │
│  │                                  │           │
│  │   Skor: 2-1                     │           │
│  │   Güven: 72%                    │           │
│  └─────────────────────────────────┘           │
│                                                  │
├─────────────────────────────────────────────────┤
│  [Tahmin] [İstatistik] [Form] [H2H]            │ Tabs
├─────────────────────────────────────────────────┤
│                                                  │
│  📊 Tab İçeriği (Dynamic)                       │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Tab İçerikleri (Lazy Load)

**Tab 1: Tahmin**
```typescript
<PredictionTab>
  {/* Probability Visualization */}
  <ProbabilityBar />
  
  {/* AI Açıklama */}
  <AIInsight>
    "Man United son 5 ev maçında 4 galibiyet aldı. 
     Liverpool'un sakatlık problemi var."
  </AIInsight>
  
  {/* Key Factors (Top 3) */}
  <KeyFactors>
    1. 🏠 Ev avantajı (+35% etki)
    2. 🔴 Sakatlıklar (-20% Liverpool)
    3. 📈 Form (Man United yükselişte)
  </KeyFactors>
</PredictionTab>
```

**Tab 2: İstatistik**
```typescript
<StatsTab>
  {/* Comparison Bars */}
  <StatCompare>
    <Stat label="Gol Ortalaması">
      <Bar home={2.1} away={1.8} />
    </Stat>
    <Stat label="Yenilmezlik">
      <Bar home={45} away={52} />
    </Stat>
  </StatCompare>
</StatsTab>
```

**Tab 3: Form**
```typescript
<FormTab>
  {/* Last 5 Matches (Mini) */}
  <FormLine team="home">
    W W D W L  (10 pts)
  </FormLine>
  <FormLine team="away">
    W L D D W  (8 pts)
  </FormLine>
</FormTab>
```

**Tab 4: H2H**
```typescript
<H2HTab>
  {/* Last 5 Head to Head */}
  <MiniMatchList>
    {last5Matches.map(match => (
      <MiniMatch>
        {match.date} • {match.score} • {match.competition}
      </MiniMatch>
    ))}
  </MiniMatchList>
</H2HTab>
```

---

## COMPONENT LIBRARY (Minimal Set)

### Core Components (shadcn/ui based)

```typescript
// 1. MatchCard
<MatchCard 
  variant="compact" | "detailed"
  status="upcoming" | "live" | "finished"
/>

// 2. ProbabilityBar
<ProbabilityBar 
  home={45.2} 
  draw={28.5} 
  away={26.3}
  showLabels={true}
/>

// 3. ConfidenceMeter
<ConfidenceMeter 
  score={72}
  size="sm" | "md" | "lg"
/>

// 4. TeamBadge
<TeamBadge 
  team={team}
  size={32}
  showName={false}
/>

// 5. StatBar
<StatBar 
  label="Possession"
  home={58}
  away={42}
/>

// 6. FormIndicator
<FormIndicator 
  form="WWDWL"
  variant="dots" | "letters"
/>

// 7. LiveIndicator
<LiveIndicator 
  minute={67}
  status="live"
/>
```

---

## SMART FEATURES

### 1. Akıllı Sıralama
```typescript
// Kullanıcı davranışına göre sırala
const sortMatches = (matches, user) => {
  return matches.sort((a, b) => {
    // Favoriler önce
    if (isFavorite(a) && !isFavorite(b)) return -1
    
    // Canlı maçlar önce
    if (a.status === 'live') return -1
    
    // Yüksek güven skorlu tahminler
    if (a.confidence > 75 && b.confidence < 75) return -1
    
    // Yakın saatler önce
    return a.startTime - b.startTime
  })
}
```

### 2. Predictive Prefetch
```typescript
// Kullanıcı match card üzerine hover yaptığında
// Detay sayfası verilerini önceden yükle
<MatchCard
  onMouseEnter={() => {
    prefetchPrediction(matchId)
    prefetchStats(matchId)
  }}
/>
```

### 3. Smart Caching
```typescript
// TanStack Query ile akıllı cache
useQuery({
  queryKey: ['match', id],
  queryFn: fetchMatch,
  staleTime: matchStatus === 'live' ? 30000 : 3600000,
  // Canlı: 30sn, Upcoming: 1 saat
})
```

### 4. Progressive Disclosure
```typescript
// İlk gösterim minimal
// Kullanıcı ilgilenirse → daha fazla bilgi

<MatchCard>
  {/* Always visible */}
  <BasicInfo />
  
  {/* Hover'da göster */}
  <Popover>
    <QuickStats />
  </Popover>
  
  {/* Click'te tam detay */}
  <Modal>
    <FullAnalysis />
  </Modal>
</MatchCard>
```

---

## PERFORMANS OPTİMİZASYONLARI

### 1. Virtualization
```typescript
// 1000+ maç varsa → sadece görünenleri render et
import { useVirtualizer } from '@tanstack/react-virtual'

const virtualizer = useVirtualizer({
  count: matches.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 120, // Card height
})
```

### 2. Image Optimization
```typescript
// Next.js Image component
<Image
  src={team.logo}
  width={32}
  height={32}
  alt={team.name}
  loading="lazy"
  placeholder="blur"
/>
```

### 3. Code Splitting
```typescript
// Detay sayfası lazy load
const MatchDetail = dynamic(() => import('./MatchDetail'), {
  loading: () => <Skeleton />,
  ssr: false // Modal olduğu için
})
```

---

## RENKLENDİRME SİSTEMİ

### Semantic Colors (Minimal)

```typescript
const colors = {
  // Ana renkler
  primary: 'hsl(239 84% 67%)',     // Indigo (brand)
  
  // Tahmin sonuçları
  win: 'hsl(142 76% 36%)',         // Green
  draw: 'hsl(38 92% 50%)',         // Amber
  loss: 'hsl(0 84% 60%)',          // Red
  
  // Confidence levels
  high: 'hsl(142 76% 36%)',        // >70%
  medium: 'hsl(38 92% 50%)',       // 50-70%
  low: 'hsl(0 84% 60%)',           // <50%
  
  // Status
  live: 'hsl(0 84% 60%)',          // Red pulse
  upcoming: 'hsl(210 40% 98%)',    // White
  finished: 'hsl(215 16% 47%)',    // Gray
}
```

### Color Usage Rules
```typescript
// ✅ DOs
- Tahmin olasılıklarında gradient
- Confidence score'da semantic color
- Live maçlarda pulse animation

// ❌ DON'Ts
- Gereksiz renk kullanımı
- Takım renklerini everywhere
- Rainbow charts (sadece gerekirse)
```

---

## TYPOGRAPHY HIERARCHY

```css
/* Sadece 4 boyut kullan */
.text-xs   /* 12px - Labels, badges */
.text-sm   /* 14px - Secondary text */
.text-base /* 16px - Body text */
.text-lg   /* 18px - Card titles */
.text-xl   /* 20px - Section headers */
.text-2xl  /* 24px - Page titles */

/* Font weights */
.font-normal  /* 400 - Body */
.font-medium  /* 500 - Emphasis */
.font-semibold /* 600 - Headings */
.font-bold    /* 700 - Rare, only for impact */
```

---

## SPACING SYSTEM

```css
/* 4px base unit */
.space-1  /* 4px */
.space-2  /* 8px */
.space-3  /* 12px */
.space-4  /* 16px */
.space-6  /* 24px */
.space-8  /* 32px */

/* Component padding */
.p-4      /* Card inner padding */
.p-6      /* Modal padding */

/* Stack spacing */
.space-y-4  /* Vertical rhythm */
.gap-4      /* Grid/Flex gap */
```

---

## ANİMASYONLAR (Subtle)

```typescript
// Framer Motion - Minimal kullanım

// 1. Page transitions
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
}

// 2. Card hover
const cardVariants = {
  hover: { 
    scale: 1.02,
    boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
  }
}

// 3. Live indicator pulse
const pulseVariants = {
  animate: {
    opacity: [1, 0.5, 1],
    scale: [1, 1.1, 1]
  }
}

// ❌ KULLANMA:
- Gereksiz transitions
- Slow animations (>300ms)
- Parallax effects
- Fancy hover effects
```

---

## RESPONSIVE STRATEGY

### Mobile-First

```typescript
// Breakpoints
const breakpoints = {
  sm: '640px',   // Phone landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
}

// Layout changes
Mobile:
  - Single column
  - Full-width cards
  - Bottom navigation

Tablet:
  - 2 columns
  - Sidebar shows

Desktop:
  - 3 columns (optional)
  - Sidebar + main content
```

---

## ÖRNEK COMPONENT: MATCH CARD

```typescript
// components/matches/match-card.tsx
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface MatchCardProps {
  match: Match
  prediction?: Prediction
  variant?: 'compact' | 'detailed'
}

export function MatchCard({ 
  match, 
  prediction, 
  variant = 'compact' 
}: MatchCardProps) {
  const router = useRouter()
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={() => router.push(`/match/${match.id}`)}
      className="
        relative overflow-hidden rounded-lg 
        bg-card p-4 cursor-pointer
        border border-border
        transition-shadow hover:shadow-lg
      "
    >
      {/* Status Indicator */}
      {match.status === 'live' && (
        <div className="absolute top-2 right-2">
          <LiveIndicator minute={match.minute} />
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <time className="text-sm text-muted-foreground">
          {formatTime(match.startTime)}
        </time>
        <LeagueBadge league={match.league} size="sm" />
      </div>
      
      {/* Teams */}
      <div className="flex items-center justify-between mb-3">
        <TeamInfo team={match.homeTeam} side="home" />
        <span className="text-xs text-muted-foreground">vs</span>
        <TeamInfo team={match.awayTeam} side="away" />
      </div>
      
      {/* Prediction */}
      {prediction && (
        <div className="space-y-2">
          <ProbabilityBar 
            home={prediction.probabilities.homeWin}
            draw={prediction.probabilities.draw}
            away={prediction.probabilities.awayWin}
          />
          
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {prediction.predictedScore.home}-{prediction.predictedScore.away}
            </span>
            <ConfidenceBadge score={prediction.confidence} />
          </div>
        </div>
      )}
    </motion.div>
  )
}

// Sub-components (Minimal)
function TeamInfo({ team, side }: { team: Team; side: 'home' | 'away' }) {
  return (
    <div className={cn(
      "flex items-center gap-2",
      side === 'away' && 'flex-row-reverse'
    )}>
      <TeamBadge team={team} size={32} />
      <span className="font-medium text-sm">{team.name}</span>
    </div>
  )
}

function ConfidenceBadge({ score }: { score: number }) {
  const variant = score > 70 ? 'high' : score > 50 ? 'medium' : 'low'
  
  return (
    <span className={cn(
      "text-xs px-2 py-1 rounded-full",
      variant === 'high' && 'bg-green-500/20 text-green-500',
      variant === 'medium' && 'bg-amber-500/20 text-amber-500',
      variant === 'low' && 'bg-red-500/20 text-red-500'
    )}>
      🎯 {score}%
    </span>
  )
}
```

---

## ÖRNEK: ANA SAYFA LAYOUT

```typescript
// app/(dashboard)/page.tsx
export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header - Sticky */}
      <Header />
      
      {/* Quick Stats */}
      <section className="border-b border-border">
        <QuickStats />
      </section>
      
      {/* Tabs + Filters */}
      <section className="sticky top-16 z-10 bg-background border-b">
        <MatchTabs />
      </section>
      
      {/* Main Content */}
      <main className="container py-6">
        <MatchList />
      </main>
    </div>
  )
}

// components/layout/header.tsx
function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Logo />
        <SearchBar />
        <UserMenu />
      </div>
    </header>
  )
}

// components/matches/match-list.tsx
function MatchList() {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['matches'],
    queryFn: fetchMatches,
  })
  
  return (
    <div className="space-y-3">
      {data?.pages.map((page) => (
        page.matches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))
      ))}
      
      {hasNextPage && (
        <Button onClick={() => fetchNextPage()}>
          Load More
        </Button>
      )}
    </div>
  )
}
```

---

## ÖZET: TASARIM KURALLARI

### ✅ DO's
```
1. Data-first approach
2. Progressive disclosure
3. Smart defaults
4. Minimal animations
5. Semantic colors
6. 4px spacing system
7. Mobile-first
8. Lazy loading
9. Skeleton states
10. Clear hierarchy
```

### ❌ DON'Ts
```
1. Gereksiz dekorasyon
2. Rainbow colors
3. Fancy animations
4. Multiple font sizes
5. Cluttered layouts
6. Auto-playing content
7. Hidden features
8. Complex navigation
9. Slow transitions
10. Inconsistent spacing
```

---

## KPI'lar (Tasarım Başarı Metrikleri)

```typescript
const designKPIs = {
  // Performance
  'First Contentful Paint': '< 1.5s',
  'Time to Interactive': '< 3s',
  'Cumulative Layout Shift': '< 0.1',
  
  // UX
  'Click to Prediction': '< 2 clicks',
  'Bounce Rate': '< 40%',
  'Avg Session Duration': '> 3 min',
  
  // Engagement
  'Predictions Viewed': '> 5 per session',
  'Return Rate': '> 30%',
}
```

---

**Tasarım Felsefesi:**
> "Her pixel değerli. Gereksiz bir şey yoksa, ekleme. Gerekli bir şey eksikse, basit haliyle ekle."


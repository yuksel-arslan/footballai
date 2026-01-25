'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { PageHeader, SectionTitle } from '@/components/ui/gradient-title'
import { Brain, ChevronRight, Loader2, Target, TrendingUp, Hash, Clock, Trophy, Zap } from 'lucide-react'

// Mock upcoming matches
const upcomingMatches = [
  { id: 1, home: 'Manchester United', away: 'Liverpool', league: 'Premier League', date: '2024-01-26', time: '20:00', homelogo: '🔴', awayLogo: '🔴' },
  { id: 2, home: 'Barcelona', away: 'Real Madrid', league: 'La Liga', date: '2024-01-27', time: '21:00', homeLogo: '🔵', awayLogo: '⚪' },
  { id: 3, home: 'Bayern Munich', away: 'Dortmund', league: 'Bundesliga', date: '2024-01-27', time: '18:30', homeLogo: '🔴', awayLogo: '🟡' },
  { id: 4, home: 'Juventus', away: 'Inter Milan', league: 'Serie A', date: '2024-01-28', time: '20:45', homeLogo: '⚪', awayLogo: '🔵' },
  { id: 5, home: 'PSG', away: 'Marseille', league: 'Ligue 1', date: '2024-01-28', time: '20:45', homeLogo: '🔵', awayLogo: '⚪' },
  { id: 6, home: 'Galatasaray', away: 'Fenerbahçe', league: 'Süper Lig', date: '2024-01-26', time: '19:00', homeLogo: '🟡', awayLogo: '🟡' },
]

// Bet types
const betTypes = [
  { id: 'match_result', name: 'Maç Sonucu', description: '1X2 - Ev sahibi, beraberlik veya deplasman', icon: Trophy },
  { id: 'over_under', name: 'Alt/Üst Gol', description: 'Toplam gol sayısı tahmini', icon: Hash },
  { id: 'both_score', name: 'Karşılıklı Gol', description: 'İki takım da gol atar mı?', icon: Target },
  { id: 'first_half', name: 'İlk Yarı Sonucu', description: 'İlk yarı 1X2 tahmini', icon: Clock },
  { id: 'correct_score', name: 'Skor Tahmini', description: 'Kesin skor tahmini', icon: Zap },
  { id: 'winner_margin', name: 'Handikap', description: 'Fark tahmini', icon: TrendingUp },
]

// Mock prediction generator
function generatePrediction(_matchId: number, betType: string) {
  const predictions: Record<string, any> = {
    match_result: {
      recommendation: 'Ev Sahibi Kazanır',
      confidence: 68,
      odds: { home: 45, draw: 28, away: 27 },
      analysis: 'Ev sahibi takım son 5 maçta 4 galibiyet aldı. Deplasman takımının savunma sorunları var.',
      factors: ['Ev sahibi form üstünlüğü', 'Kafa kafaya istatistikler lehte', 'Sakat oyuncu avantajı'],
    },
    over_under: {
      recommendation: 'Üst 2.5 Gol',
      confidence: 72,
      odds: { over: 65, under: 35 },
      analysis: 'İki takım da hücum odaklı oynuyor. Son karşılaşmaların ortalaması 3.2 gol.',
      factors: ['Yüksek gol ortalaması', 'Zayıf savunmalar', 'Açık oyun beklentisi'],
    },
    both_score: {
      recommendation: 'Evet - İki Takım da Gol Atar',
      confidence: 75,
      odds: { yes: 70, no: 30 },
      analysis: 'Her iki takım da gol yeme oranı yüksek, aynı zamanda gol atma kapasiteleri iyi.',
      factors: ['Defans zafiyetleri', 'Etkili forvet hatları', 'Geçmiş maç verileri'],
    },
    first_half: {
      recommendation: 'İlk Yarı Beraberlik',
      confidence: 55,
      odds: { home: 30, draw: 40, away: 30 },
      analysis: 'Büyük maçlarda genellikle ilk yarıda temkinli başlanıyor.',
      factors: ['Derbi psikolojisi', 'Defansif başlangıç', 'İstatistiksel trend'],
    },
    correct_score: {
      recommendation: '2-1 (Ev Sahibi)',
      confidence: 18,
      odds: { score: '2-1', probability: 12 },
      analysis: 'En olası skor senaryosu analiz edildi.',
      factors: ['Gol ortalamaları', 'Form durumu', 'Tarihsel veriler'],
    },
    winner_margin: {
      recommendation: 'Ev Sahibi -1 Handikap',
      confidence: 52,
      odds: { home: 45, draw: 30, away: 25 },
      analysis: 'Ev sahibinin 2+ farkla kazanma ihtimali yüksek.',
      factors: ['Güç farkı', 'Motivasyon', 'Kadro derinliği'],
    },
  }
  return predictions[betType] || predictions.match_result
}

export default function PredictionsPage() {
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null)
  const [selectedBetType, setSelectedBetType] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  const handleMatchSelect = (matchId: number) => {
    setSelectedMatch(matchId)
    setSelectedBetType(null)
    setPrediction(null)
    setStep(2)
  }

  const handleBetTypeSelect = (betTypeId: string) => {
    setSelectedBetType(betTypeId)
    setPrediction(null)
  }

  const handleGetPrediction = async () => {
    if (!selectedMatch || !selectedBetType) return

    setLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    const result = generatePrediction(selectedMatch, selectedBetType)
    setPrediction(result)
    setLoading(false)
    setStep(3)
  }

  const handleReset = () => {
    setSelectedMatch(null)
    setSelectedBetType(null)
    setPrediction(null)
    setStep(1)
  }

  const selectedMatchData = upcomingMatches.find((m) => m.id === selectedMatch)
  const selectedBetTypeData = betTypes.find((b) => b.id === selectedBetType)

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 pb-12">
        <PageHeader
          title="AI Tahmin Merkezi"
          description="Hangi maç için tahmin almak istediğinizi seçin, bahis tipini belirleyin ve yapay zeka destekli analizi görün."
          gradient="neon"
          badge={{
            icon: <Brain className="w-4 h-4 text-[#0EA5E9]" />,
            text: 'Tahmin Talep Et',
          }}
          neonGlow
        />

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[
            { num: 1, label: 'Maç Seç' },
            { num: 2, label: 'Bahis Tipi' },
            { num: 3, label: 'Tahmin Al' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                    step >= s.num
                      ? 'bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] text-white'
                      : 'bg-card border border-border text-muted-foreground'
                  }`}
                  style={step >= s.num ? { boxShadow: '0 0 20px rgba(14, 165, 233, 0.5)' } : {}}
                >
                  {s.num}
                </div>
                <span className={`text-xs mt-1 ${step >= s.num ? 'text-[#0EA5E9]' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <ChevronRight className={`w-5 h-5 ${step > s.num ? 'text-[#0EA5E9]' : 'text-muted-foreground'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Match Selection */}
        {step === 1 && (
          <section>
            <SectionTitle gradient="primary" description="Tahmin almak istediğiniz maçı seçin" neonGlow>
              Yaklaşan Maçlar
            </SectionTitle>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingMatches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => handleMatchSelect(match.id)}
                  className="neon-card p-6 rounded-xl text-left transition-all duration-300 hover:scale-[1.02] group"
                >
                  <div className="text-xs text-muted-foreground mb-3 flex items-center justify-between">
                    <span>{match.league}</span>
                    <span>{match.date} • {match.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold group-hover:text-[#0EA5E9] transition-colors">{match.home}</p>
                    </div>
                    <div className="px-4 text-muted-foreground text-sm">vs</div>
                    <div className="flex-1 text-right">
                      <p className="font-semibold group-hover:text-[#0EA5E9] transition-colors">{match.away}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <span
                      className="text-xs px-3 py-1 rounded-full bg-[#2563EB]/10 text-[#0EA5E9] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Seç →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Step 2: Bet Type Selection */}
        {step === 2 && selectedMatchData && (
          <section>
            {/* Selected Match Display */}
            <div className="neon-card p-6 rounded-xl mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{selectedMatchData.league}</p>
                  <p className="text-xl font-bold">
                    <span className="text-[#0EA5E9]">{selectedMatchData.home}</span>
                    <span className="text-muted-foreground mx-3">vs</span>
                    <span className="text-[#0EA5E9]">{selectedMatchData.away}</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedMatchData.date} • {selectedMatchData.time}</p>
                </div>
                <button
                  onClick={handleReset}
                  className="text-sm text-muted-foreground hover:text-[#0EA5E9] transition-colors"
                >
                  Değiştir
                </button>
              </div>
            </div>

            <SectionTitle gradient="secondary" description="Hangi tip bahis için tahmin istiyorsunuz?" neonGlow>
              Bahis Tipini Seçin
            </SectionTitle>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {betTypes.map((bet) => {
                const Icon = bet.icon
                const isSelected = selectedBetType === bet.id
                return (
                  <button
                    key={bet.id}
                    onClick={() => handleBetTypeSelect(bet.id)}
                    className={`p-6 rounded-xl text-left transition-all duration-300 border ${
                      isSelected
                        ? 'border-[#0EA5E9] bg-[#0EA5E9]/10'
                        : 'border-border bg-card hover:border-[#0EA5E9]/50'
                    }`}
                    style={isSelected ? { boxShadow: '0 0 20px rgba(14, 165, 233, 0.3)' } : {}}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-[#0EA5E9]' : 'bg-[#2563EB]/20'
                        }`}
                      >
                        <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-[#0EA5E9]'}`} />
                      </div>
                      <div>
                        <p className={`font-semibold ${isSelected ? 'text-[#0EA5E9]' : ''}`}>{bet.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">{bet.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Get Prediction Button */}
            {selectedBetType && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleGetPrediction}
                  disabled={loading}
                  className="btn-neon px-8 py-4 rounded-xl text-lg font-semibold flex items-center gap-3 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analiz Ediliyor...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5" />
                      Tahmin Al
                    </>
                  )}
                </button>
              </div>
            )}
          </section>
        )}

        {/* Step 3: Show Prediction */}
        {step === 3 && prediction && selectedMatchData && selectedBetTypeData && (
          <section>
            {/* Match & Bet Type Header */}
            <div className="neon-card p-6 rounded-xl mb-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{selectedMatchData.league} • {selectedBetTypeData.name}</p>
                  <p className="text-xl font-bold">
                    <span className="text-[#0EA5E9]">{selectedMatchData.home}</span>
                    <span className="text-muted-foreground mx-3">vs</span>
                    <span className="text-[#0EA5E9]">{selectedMatchData.away}</span>
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-lg border border-border text-sm hover:border-[#0EA5E9] transition-colors"
                >
                  Yeni Tahmin
                </button>
              </div>
            </div>

            {/* Prediction Result */}
            <div
              className="rounded-2xl p-8 mb-8"
              style={{
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(14, 165, 233, 0.1))',
                border: '1px solid rgba(14, 165, 233, 0.3)',
                boxShadow: '0 0 40px rgba(14, 165, 233, 0.2)',
              }}
            >
              <div className="text-center mb-8">
                <p className="text-sm text-muted-foreground mb-2">AI Tahmini</p>
                <h2
                  className="text-3xl font-bold bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(14, 165, 233, 0.5))' }}
                >
                  {prediction.recommendation}
                </h2>
              </div>

              {/* Confidence Meter */}
              <div className="max-w-md mx-auto mb-8">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Güven Oranı</span>
                  <span
                    className="font-bold"
                    style={{
                      color: prediction.confidence >= 70 ? '#10B981' : prediction.confidence >= 50 ? '#FBBF24' : '#EF4444',
                    }}
                  >
                    %{prediction.confidence}
                  </span>
                </div>
                <div className="h-3 bg-card rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${prediction.confidence}%`,
                      background:
                        prediction.confidence >= 70
                          ? 'linear-gradient(90deg, #10B981, #34D399)'
                          : prediction.confidence >= 50
                          ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                          : 'linear-gradient(90deg, #EF4444, #F87171)',
                      boxShadow:
                        prediction.confidence >= 70
                          ? '0 0 15px rgba(16, 185, 129, 0.5)'
                          : prediction.confidence >= 50
                          ? '0 0 15px rgba(251, 191, 36, 0.5)'
                          : '0 0 15px rgba(239, 68, 68, 0.5)',
                    }}
                  />
                </div>
              </div>

              {/* Odds Distribution */}
              {prediction.odds && (
                <div className="grid gap-4 sm:grid-cols-3 mb-8">
                  {Object.entries(prediction.odds).map(([key, value]) => (
                    <div key={key} className="bg-card/50 rounded-xl p-4 text-center">
                      <p className="text-sm text-muted-foreground capitalize mb-1">
                        {key === 'home' ? 'Ev Sahibi' : key === 'draw' ? 'Beraberlik' : key === 'away' ? 'Deplasman' : key === 'over' ? 'Üst' : key === 'under' ? 'Alt' : key === 'yes' ? 'Evet' : key === 'no' ? 'Hayır' : key}
                      </p>
                      <p className="text-2xl font-bold text-[#0EA5E9]">%{String(value)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Analysis */}
              <div className="bg-card/30 rounded-xl p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-[#0EA5E9]" />
                  AI Analizi
                </h3>
                <p className="text-muted-foreground mb-4">{prediction.analysis}</p>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#0EA5E9]">Önemli Faktörler:</p>
                  <ul className="space-y-1">
                    {prediction.factors.map((factor: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9]" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="text-center text-xs text-muted-foreground">
              <p>⚠️ Bu tahminler yalnızca bilgilendirme amaçlıdır. Bahis kararlarınız tamamen size aittir.</p>
              <p className="mt-1">Model doğruluğu geçmiş performansa dayanır ve gelecek sonuçları garanti etmez.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

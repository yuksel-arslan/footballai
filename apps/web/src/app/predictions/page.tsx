'use client'

import { useState } from 'react'
import { Brain, ChevronRight, Loader2, Target, TrendingUp, Hash, Clock, Trophy, Zap } from 'lucide-react'

// Mock upcoming matches
const upcomingMatches = [
  { id: 1, home: 'Man United', away: 'Liverpool', league: 'Premier League', date: '26 Oca', time: '20:00' },
  { id: 2, home: 'Barcelona', away: 'Real Madrid', league: 'La Liga', date: '27 Oca', time: '21:00' },
  { id: 3, home: 'Bayern', away: 'Dortmund', league: 'Bundesliga', date: '27 Oca', time: '18:30' },
  { id: 4, home: 'Juventus', away: 'Inter', league: 'Serie A', date: '28 Oca', time: '20:45' },
  { id: 5, home: 'Galatasaray', away: 'Fenerbahçe', league: 'Süper Lig', date: '26 Oca', time: '19:00' },
  { id: 6, home: 'PSG', away: 'Marseille', league: 'Ligue 1', date: '28 Oca', time: '20:45' },
]

// Bet types
const betTypes = [
  { id: 'match_result', name: 'Maç Sonucu', desc: '1X2', icon: Trophy },
  { id: 'over_under', name: 'Alt/Üst', desc: 'Toplam gol', icon: Hash },
  { id: 'both_score', name: 'KG Var/Yok', desc: 'İki takım gol', icon: Target },
  { id: 'first_half', name: 'İlk Yarı', desc: 'İY sonucu', icon: Clock },
  { id: 'correct_score', name: 'Skor', desc: 'Kesin skor', icon: Zap },
  { id: 'winner_margin', name: 'Handikap', desc: 'Fark', icon: TrendingUp },
]

// Mock prediction generator
function generatePrediction(_matchId: number, betType: string) {
  const predictions: Record<string, any> = {
    match_result: {
      recommendation: 'Ev Sahibi Kazanır',
      confidence: 68,
      odds: { home: 45, draw: 28, away: 27 },
      analysis: 'Ev sahibi takım son 5 maçta 4 galibiyet aldı.',
      factors: ['Ev sahibi form üstünlüğü', 'Kafa kafaya istatistikler lehte'],
    },
    over_under: {
      recommendation: 'Üst 2.5 Gol',
      confidence: 72,
      odds: { over: 65, under: 35 },
      analysis: 'İki takım da hücum odaklı oynuyor.',
      factors: ['Yüksek gol ortalaması', 'Zayıf savunmalar'],
    },
    both_score: {
      recommendation: 'Evet - KG Var',
      confidence: 75,
      odds: { yes: 70, no: 30 },
      analysis: 'Her iki takım da gol yeme oranı yüksek.',
      factors: ['Defans zafiyetleri', 'Etkili forvet hatları'],
    },
    first_half: {
      recommendation: 'İlk Yarı Beraberlik',
      confidence: 55,
      odds: { home: 30, draw: 40, away: 30 },
      analysis: 'Büyük maçlarda genellikle temkinli başlanıyor.',
      factors: ['Derbi psikolojisi', 'Defansif başlangıç'],
    },
    correct_score: {
      recommendation: '2-1 Ev Sahibi',
      confidence: 18,
      odds: { score: '2-1', probability: 12 },
      analysis: 'En olası skor senaryosu.',
      factors: ['Gol ortalamaları', 'Form durumu'],
    },
    winner_margin: {
      recommendation: 'Ev -1 Handikap',
      confidence: 52,
      odds: { home: 45, draw: 30, away: 25 },
      analysis: 'Ev sahibinin farkla kazanma ihtimali yüksek.',
      factors: ['Güç farkı', 'Motivasyon'],
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
    await new Promise((resolve) => setTimeout(resolve, 1200))
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
      <main className="container mx-auto px-3 sm:px-4 pb-6">
        {/* Compact Header */}
        <div className="py-4 sm:py-6">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-[#0EA5E9]" />
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent">
              AI Tahmin
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">Maç seç, bahis tipi belirle, tahmin al</p>
        </div>

        {/* Progress Steps - Compact */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          {[
            { num: 1, label: 'Maç' },
            { num: 2, label: 'Tip' },
            { num: 3, label: 'Tahmin' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-2 sm:gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                    step >= s.num
                      ? 'bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] text-white'
                      : 'bg-card border border-border text-muted-foreground'
                  }`}
                >
                  {s.num}
                </div>
                <span className={`text-[10px] sm:text-xs mt-0.5 ${step >= s.num ? 'text-[#0EA5E9]' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
              {i < 2 && <ChevronRight className={`w-4 h-4 ${step > s.num ? 'text-[#0EA5E9]' : 'text-muted-foreground'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Match Selection */}
        {step === 1 && (
          <section>
            <h2 className="text-sm sm:text-base font-semibold mb-3 text-[#0EA5E9]">Maç Seç</h2>
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingMatches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => handleMatchSelect(match.id)}
                  className="neon-card p-3 sm:p-4 rounded-lg text-left transition-all hover:scale-[1.01] group"
                >
                  <div className="text-[10px] sm:text-xs text-muted-foreground mb-2 flex justify-between">
                    <span>{match.league}</span>
                    <span>{match.date} {match.time}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium truncate flex-1">{match.home}</span>
                    <span className="text-muted-foreground mx-2">vs</span>
                    <span className="font-medium truncate flex-1 text-right">{match.away}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Step 2: Bet Type Selection */}
        {step === 2 && selectedMatchData && (
          <section>
            {/* Selected Match - Compact */}
            <div className="neon-card p-3 rounded-lg mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">{selectedMatchData.league}</p>
                <p className="text-sm font-medium">
                  <span className="text-[#0EA5E9]">{selectedMatchData.home}</span>
                  <span className="text-muted-foreground mx-2">vs</span>
                  <span className="text-[#0EA5E9]">{selectedMatchData.away}</span>
                </p>
              </div>
              <button onClick={handleReset} className="text-xs text-muted-foreground hover:text-[#0EA5E9]">
                Değiştir
              </button>
            </div>

            <h2 className="text-sm sm:text-base font-semibold mb-3 text-[#0EA5E9]">Bahis Tipi</h2>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
              {betTypes.map((bet) => {
                const Icon = bet.icon
                const isSelected = selectedBetType === bet.id
                return (
                  <button
                    key={bet.id}
                    onClick={() => handleBetTypeSelect(bet.id)}
                    className={`p-3 rounded-lg text-left transition-all border ${
                      isSelected ? 'border-[#0EA5E9] bg-[#0EA5E9]/10' : 'border-border bg-card hover:border-[#0EA5E9]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[#0EA5E9]' : 'text-muted-foreground'}`} />
                      <span className={`text-xs sm:text-sm font-medium ${isSelected ? 'text-[#0EA5E9]' : ''}`}>{bet.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{bet.desc}</p>
                  </button>
                )
              })}
            </div>

            {/* Get Prediction Button */}
            {selectedBetType && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={handleGetPrediction}
                  disabled={loading}
                  className="btn-neon px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analiz...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
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
            {/* Match Header - Compact */}
            <div className="neon-card p-3 rounded-lg mb-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground">{selectedMatchData.league} • {selectedBetTypeData.name}</p>
                <p className="text-sm font-medium">
                  <span className="text-[#0EA5E9]">{selectedMatchData.home}</span>
                  <span className="text-muted-foreground mx-2">vs</span>
                  <span className="text-[#0EA5E9]">{selectedMatchData.away}</span>
                </p>
              </div>
              <button onClick={handleReset} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:border-[#0EA5E9]">
                Yeni
              </button>
            </div>

            {/* Prediction Result - Compact */}
            <div className="rounded-xl p-4 sm:p-5 mb-4 bg-gradient-to-br from-[#2563EB]/10 to-[#0EA5E9]/10 border border-[#0EA5E9]/30">
              <div className="text-center mb-4">
                <p className="text-xs text-muted-foreground mb-1">AI Tahmini</p>
                <h2 className="text-lg sm:text-xl font-bold text-[#0EA5E9]">{prediction.recommendation}</h2>
              </div>

              {/* Confidence Meter */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Güven</span>
                  <span className="font-bold" style={{ color: prediction.confidence >= 70 ? '#10B981' : prediction.confidence >= 50 ? '#FBBF24' : '#EF4444' }}>
                    %{prediction.confidence}
                  </span>
                </div>
                <div className="h-2 bg-card rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${prediction.confidence}%`,
                      background: prediction.confidence >= 70 ? 'linear-gradient(90deg, #10B981, #34D399)' : prediction.confidence >= 50 ? 'linear-gradient(90deg, #F59E0B, #FBBF24)' : 'linear-gradient(90deg, #EF4444, #F87171)',
                    }}
                  />
                </div>
              </div>

              {/* Odds */}
              {prediction.odds && (
                <div className="grid gap-2 grid-cols-3 mb-4">
                  {Object.entries(prediction.odds).map(([key, value]) => (
                    <div key={key} className="bg-card/50 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {key === 'home' ? 'Ev' : key === 'draw' ? 'X' : key === 'away' ? 'Dep' : key === 'over' ? 'Üst' : key === 'under' ? 'Alt' : key === 'yes' ? 'Var' : key === 'no' ? 'Yok' : key}
                      </p>
                      <p className="text-sm font-bold text-[#0EA5E9]">%{String(value)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Analysis - Compact */}
              <div className="bg-card/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">{prediction.analysis}</p>
                <div className="flex flex-wrap gap-1">
                  {prediction.factors.map((factor: string, i: number) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9]">
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-center text-[10px] text-muted-foreground">
              Bu tahminler bilgilendirme amaçlıdır. Bahis kararlarınız size aittir.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

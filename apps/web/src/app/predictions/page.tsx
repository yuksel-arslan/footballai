'use client'

import { Header } from '@/components/layout/header'
import { MatchList } from '@/components/matches/match-list'
import { PageHeader, SectionTitle, NeonStat } from '@/components/ui/gradient-title'
import { Brain, TrendingUp, Target, Zap, Award, BarChart3 } from 'lucide-react'

export default function PredictionsPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 pb-12">
        <PageHeader
          title="AI Tahminleri"
          description="Makine öğrenmesi modellerimiz ile oluşturulan maç tahminlerini inceleyin. Model, takım performansı, head-to-head istatistikleri ve form verilerini analiz eder."
          gradient="neon"
          badge={{
            icon: <Brain className="w-4 h-4 text-[#0EA5E9]" />,
            text: 'Yapay Zeka Destekli',
          }}
          neonGlow
        />

        {/* Model Stats with Neon */}
        <section className="mb-12">
          <SectionTitle gradient="secondary" neonGlow>Model İstatistikleri</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NeonStat value="72%" label="Model Doğruluğu" color="green" />
            <NeonStat value="1,248" label="Analiz Edilen Maç" color="blue" />
            <NeonStat value="899" label="Başarılı Tahmin" color="cyan" />
            <NeonStat value="78%" label="Ortalama Güven" color="gold" />
          </div>
        </section>

        {/* Today's Predictions */}
        <section className="mb-12">
          <SectionTitle
            gradient="primary"
            description="Bugün oynanacak maçlar için AI tahminleri"
            neonGlow
          >
            Bugünün Tahminleri
          </SectionTitle>
          <MatchList filter="upcoming" />
        </section>

        {/* Model Info with Neon Card */}
        <section>
          <div className="neon-card rounded-2xl p-8">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 neon-pulse"
                style={{ background: 'linear-gradient(135deg, #2563EB, #0EA5E9)' }}
              >
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3
                  className="text-xl font-bold mb-2 bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] bg-clip-text text-transparent"
                  style={{ filter: 'drop-shadow(0 0 15px rgba(14, 165, 233, 0.4))' }}
                >
                  Tahmin Modeli Hakkında
                </h3>
                <p className="text-muted-foreground mb-4">
                  FutballAI tahmin modeli, son 5 yılın maç verilerini kullanarak eğitilmiştir.
                  Model şu faktörleri analiz eder:
                </p>
                <ul className="grid gap-2 sm:grid-cols-2 text-sm">
                  {[
                    'Takım form durumu (son 5 maç)',
                    'Head-to-head istatistikleri',
                    'Ev/deplasman performansı',
                    'Gol atma/yeme ortalaması',
                    'Sakatlık ve ceza durumu',
                    'Maç önemi (şampiyonluk, küme düşme)',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: 'linear-gradient(135deg, #2563EB, #0EA5E9)',
                          boxShadow: '0 0 8px rgba(14, 165, 233, 0.5)'
                        }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

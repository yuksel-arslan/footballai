'use client'

import { Header } from '@/components/layout/header'
import { MatchList } from '@/components/matches/match-list'
import { PageHeader, SectionTitle } from '@/components/ui/gradient-title'
import { Brain, TrendingUp, Target, Zap, Award, BarChart3 } from 'lucide-react'

// Stats card component
function StatCard({
  icon,
  title,
  value,
  trend,
  color,
}: {
  icon: React.ReactNode
  title: string
  value: string
  trend?: string
  color: string
}) {
  return (
    <div className="glass-card rounded-2xl p-6 card-hover">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {trend && (
        <p className="text-sm text-green-500 mt-2 flex items-center gap-1">
          <TrendingUp className="w-4 h-4" />
          {trend}
        </p>
      )}
    </div>
  )
}

export default function PredictionsPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 pb-12">
        <PageHeader
          title="AI Tahminleri"
          description="Makine öğrenmesi modellerimiz ile oluşturulan maç tahminlerini inceleyin. Model, takım performansı, head-to-head istatistikleri ve form verilerini analiz eder."
          gradient="secondary"
          badge={{
            icon: <Brain className="w-4 h-4 text-secondary" />,
            text: 'Yapay Zeka Destekli',
          }}
        />

        {/* Model Stats */}
        <section className="mb-12">
          <SectionTitle gradient="secondary">Model İstatistikleri</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Target className="w-6 h-6 text-white" />}
              title="Model Doğruluğu"
              value="72%"
              trend="+3% bu ay"
              color="from-green-500 to-emerald-600"
            />
            <StatCard
              icon={<Zap className="w-6 h-6 text-white" />}
              title="Analiz Edilen Maç"
              value="1,248"
              color="from-blue-500 to-indigo-600"
            />
            <StatCard
              icon={<Award className="w-6 h-6 text-white" />}
              title="Başarılı Tahmin"
              value="899"
              color="from-purple-500 to-pink-600"
            />
            <StatCard
              icon={<BarChart3 className="w-6 h-6 text-white" />}
              title="Ortalama Güven"
              value="78%"
              color="from-amber-500 to-orange-600"
            />
          </div>
        </section>

        {/* Today's Predictions */}
        <section className="mb-12">
          <SectionTitle
            gradient="primary"
            description="Bugün oynanacak maçlar için AI tahminleri"
          >
            Bugünün Tahminleri
          </SectionTitle>
          <MatchList filter="upcoming" />
        </section>

        {/* Model Info */}
        <section>
          <div className="glass-card rounded-2xl p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Tahmin Modeli Hakkında</h3>
                <p className="text-muted-foreground mb-4">
                  Futball AI tahmin modeli, son 5 yılın maç verilerini kullanarak eğitilmiştir.
                  Model şu faktörleri analiz eder:
                </p>
                <ul className="grid gap-2 sm:grid-cols-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Takım form durumu (son 5 maç)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Head-to-head istatistikleri
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Ev/deplasman performansı
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Gol atma/yeme ortalaması
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Sakatlık ve ceza durumu
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Maç önemi (şampiyonluk, küme düşme)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

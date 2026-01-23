import { Header } from '@/components/layout/header'
import { QuickStats } from '@/components/home/quick-stats'
import { MatchList } from '@/components/matches/match-list'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4">
        {/* Quick Stats */}
        <section className="border-b border-border py-6">
          <QuickStats />
        </section>

        {/* Hero Section */}
        <section className="py-12">
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 p-8">
            <h1 className="text-4xl font-bold text-balance">
              AI Destekli Futbol Tahminleri
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Yapay zeka ile gelecek maçları tahmin edin
            </p>
          </div>
        </section>

        {/* Match List */}
        <section className="pb-12">
          <h2 className="mb-6 text-2xl font-bold">Bugünün Tahminleri</h2>
          <MatchList />
        </section>
      </main>
    </div>
  )
}

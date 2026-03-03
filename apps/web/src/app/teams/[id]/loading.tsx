import { Skeleton } from '@/components/ui/skeleton'

export default function TeamDetailLoading() {
  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 space-y-6">
      <Skeleton className="h-5 w-32" />

      {/* Team header */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 flex items-center gap-4">
        <Skeleton className="w-24 h-24 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Recent matches */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-12 rounded-lg"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

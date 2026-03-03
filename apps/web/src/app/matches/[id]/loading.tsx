import { Skeleton } from '@/components/ui/skeleton'

export default function MatchDetailLoading() {
  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 space-y-6">
      {/* Back button */}
      <Skeleton className="h-5 w-32" />

      {/* Match header card */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex items-center justify-between gap-8">
          <div className="flex-1 flex flex-col items-center gap-2">
            <Skeleton className="w-20 h-20 rounded-xl" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-12 w-24" />
          <div className="flex-1 flex flex-col items-center gap-2">
            <Skeleton className="w-20 h-20 rounded-xl" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>

      {/* Prediction cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>

      {/* H2H & Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-7 h-7 rounded-full" />
            ))}
          </div>
          <div className="flex gap-1.5 mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-7 h-7 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

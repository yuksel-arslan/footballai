import { Skeleton } from '@/components/ui/skeleton'

export default function MatchDetailLoading() {
  return (
    <div className="min-h-screen">
      <div className="w-full px-3 sm:px-4 py-6 space-y-6">
        {/* Back button */}
        <Skeleton className="h-5 w-32" />

        {/* Match header card */}
        <div className="neon-card rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <div className="flex items-center justify-between gap-8">
            <div className="flex-1 flex flex-col items-center gap-3">
              <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-12 w-24" />
            <div className="flex-1 flex flex-col items-center gap-3">
              <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>

        {/* Prediction cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="neon-card rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="h-5 w-28" />
            </div>
            <Skeleton className="h-16 w-full rounded-xl" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
            </div>
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
          <div className="neon-card rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="h-5 w-28" />
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

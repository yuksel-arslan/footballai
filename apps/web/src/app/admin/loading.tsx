export default function AdminLoading() {
  return (
    <div className="space-y-4 p-4">
      <div className="h-8 w-48 bg-muted rounded-lg animate-pulse" />
      <div className="h-4 w-72 bg-muted/60 rounded animate-pulse" />
      <div className="grid gap-4 mt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 bg-card border border-border rounded-xl animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

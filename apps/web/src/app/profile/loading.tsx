export default function ProfileLoading() {
  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto">
      <div className="h-8 w-32 bg-muted rounded-lg animate-pulse" />
      <div className="h-4 w-56 bg-muted/60 rounded animate-pulse" />
      <div className="h-32 bg-card border border-border rounded-xl animate-pulse" />
      <div className="h-48 bg-card border border-border rounded-xl animate-pulse" style={{ animationDelay: '100ms' }} />
      <div className="h-36 bg-card border border-border rounded-xl animate-pulse" style={{ animationDelay: '200ms' }} />
    </div>
  )
}

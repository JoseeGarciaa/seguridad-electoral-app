export default function Loading() {
  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      <div className="glass rounded-xl border border-border/50 p-4 h-24 animate-pulse bg-secondary/40" />

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="h-[300px] rounded-xl animate-pulse bg-secondary/40 border border-border/50" />
        <div className="h-[500px] rounded-xl animate-pulse bg-secondary/40 border border-border/50" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="h-80 rounded-xl animate-pulse bg-secondary/40 border border-border/50" />
        <div className="h-80 rounded-xl animate-pulse bg-secondary/40 border border-border/50" />
      </div>

      <div className="h-[650px] rounded-xl animate-pulse bg-secondary/40 border border-border/50" />
    </div>
  )
}

export function SkeletonLine({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted/60 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-muted/60" />
      <div className="flex-1 space-y-2">
        <SkeletonLine className="h-3 w-1/2" />
        <SkeletonLine className="h-3 w-1/3" />
      </div>
      <SkeletonLine className="h-4 w-16" />
    </div>
  );
}

export function SkeletonList({ n = 4 }: { n?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: n }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonChart({ h = 224 }: { h?: number }) {
  return (
    <div
      className="w-full animate-pulse rounded-xl bg-muted/40"
      style={{ height: h }}
    />
  );
}

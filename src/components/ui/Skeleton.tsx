import { cn } from "@/lib/utils";

// A shimmering placeholder block. Showing the *shape* of the content that's
// coming reads as much faster than a "Loading..." string, and stops the
// layout jumping once data lands.
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div style={style} className={cn("animate-pulse rounded bg-togo-surface-2", className)} />;
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-togo-surface border border-togo-border rounded-md p-4">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="mt-3 h-7 w-10" />
          <Skeleton className="mt-3 h-2 w-24" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="bg-togo-surface border border-togo-border rounded-md overflow-hidden"
    >
      <div className="flex items-center gap-3 border-b border-togo-border px-4 py-3">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-2.5 w-16" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-togo-border px-4 py-3 last:border-b-0">
          <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
          <Skeleton className="h-3 flex-1" style={{ maxWidth: `${70 - i * 6}%` }} />
          <Skeleton className="h-3 w-16 shrink-0" />
          <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-togo-surface border border-togo-border rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

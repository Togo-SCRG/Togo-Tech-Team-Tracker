import { cn } from "@/lib/utils";

// Thin progress track used for project completion and hours-vs-cap. Exposes
// real ARIA progressbar semantics so the value is available to screen readers
// instead of being conveyed by width alone.
export function ProgressBar({
  value,
  color,
  label,
  className,
  overCap = false,
}: {
  value: number;
  color?: string;
  label?: string;
  className?: string;
  overCap?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-togo-surface-2", className)}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${clamped}%`,
          backgroundColor: color ?? (overCap ? "var(--status-blocked-fg)" : "var(--togo-blue)"),
        }}
      />
    </div>
  );
}

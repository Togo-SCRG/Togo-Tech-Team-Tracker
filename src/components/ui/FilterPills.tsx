"use client";

import { cn } from "@/lib/utils";

export interface FilterPill {
  label: string;
  value: string;
}

// The status filter row shared by the tracker and projects pages. Each pill
// carries a live count so you can see how the work splits across statuses
// *before* clicking — and a pill whose count is 0 is dimmed rather than
// hidden, so the set of options never shifts around under the cursor.
export function FilterPills({
  pills,
  value,
  onChange,
  counts,
  label = "Filter by status",
  className,
}: {
  pills: FilterPill[];
  value: string;
  onChange: (value: string) => void;
  counts?: Record<string, number>;
  label?: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {pills.map((p) => {
        const active = value === p.value;
        const count = counts?.[p.value];
        const empty = count === 0 && !active;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-togo-blue bg-togo-blue text-white"
                : "border-togo-border bg-togo-surface-2 text-togo-muted hover:border-togo-border-strong hover:text-togo-white",
              empty && "opacity-50"
            )}
          >
            {p.label}
            {count !== undefined && (
              <span
                className={cn(
                  "tnum rounded px-1 text-[10px] font-semibold leading-4",
                  active ? "bg-white/25 text-white" : "bg-togo-border text-togo-muted"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

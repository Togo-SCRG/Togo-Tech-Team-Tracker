"use client";

import { cn } from "@/lib/utils";

export interface SegmentedTab {
  label: string;
  value: string;
  count?: number;
}

/**
 * A small segmented control for switching *what set of rows you're looking at*
 * — as opposed to FilterPills, which narrows the set you're already in.
 *
 * Segmented rather than the underlined tabs used on the notifications page:
 * these sit inline next to a search box, and an underline strip reads as the
 * heading of everything below it rather than one control on a toolbar row.
 */
export function SegmentedTabs({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: SegmentedTab[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-md border border-togo-border bg-togo-surface-2 p-0.5",
        className
      )}
    >
      {tabs.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-togo-surface text-togo-white shadow-[var(--shadow-card)]"
                : "text-togo-muted hover:text-togo-white"
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "tnum rounded px-1 text-[10px] font-semibold leading-4",
                  active ? "bg-togo-blue/15 text-togo-blue" : "bg-togo-border text-togo-muted"
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

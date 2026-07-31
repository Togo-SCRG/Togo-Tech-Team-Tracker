"use client";

import { LayoutGrid, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "table" | "card";

// Table/card switch used on the tracker, projects and team pages. Modelled as
// a radio group so screen readers announce which layout is active — the old
// hand-rolled version was two unlabelled icon buttons.
export function ViewToggle({
  value,
  onChange,
  className,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  className?: string;
}) {
  const options: { mode: ViewMode; icon: typeof Table2; label: string }[] = [
    { mode: "table", icon: Table2, label: "Table view" },
    { mode: "card", icon: LayoutGrid, label: "Card view" },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Layout"
      className={cn("flex items-center rounded-md border border-togo-border bg-togo-surface-2 p-1", className)}
    >
      {options.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={value === mode}
          aria-label={label}
          title={label}
          onClick={() => onChange(mode)}
          className={cn(
            "rounded p-1.5 transition-colors",
            value === mode ? "bg-togo-blue text-white" : "text-togo-muted hover:text-togo-white"
          )}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}

"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortDirection } from "@/lib/useSort";

// Table header cell that sorts on click. The sort arrow is always rendered
// (faint when inactive) so the column doesn't shift width when you sort it,
// and `aria-sort` tells assistive tech the current order.
export function SortableHeader({
  label,
  active,
  direction,
  onClick,
  className,
  align = "left",
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  className?: string;
  align?: "left" | "right";
}) {
  const Icon = !active ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-4 py-2.5 font-medium", className)}
    >
      <button
        type="button"
        onClick={onClick}
        title={`Sort by ${label.toLowerCase()}`}
        className={cn(
          "group inline-flex items-center gap-1 text-[10px] uppercase tracking-wider transition-colors",
          align === "right" && "flex-row-reverse",
          active ? "text-togo-blue" : "text-togo-faint hover:text-togo-muted"
        )}
      >
        {label}
        <Icon size={12} className={cn("shrink-0", !active && "opacity-0 group-hover:opacity-60 transition-opacity")} />
      </button>
    </th>
  );
}

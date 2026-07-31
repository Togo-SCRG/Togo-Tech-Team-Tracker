"use client";

import { cn, nextStatus } from "@/lib/utils";

// Compact pill: tinted background + saturated text + hairline border.
// Tints come from CSS variables so they adapt to light/dark themes.
const STATUS_STYLES: Record<string, string> = {
  "Not Started": "bg-togo-surface-2 text-togo-faint border-togo-border",
  "In Progress":
    "bg-[var(--status-progress-bg)] text-[#0797DF] border-[var(--status-progress-border)]",
  Review:
    "bg-[var(--status-review-bg)] text-[var(--status-review-fg)] border-[var(--status-review-border)]",
  Completed:
    "bg-[var(--status-completed-bg)] text-[var(--status-completed-fg)] border-[var(--status-completed-border)]",
  "On Hold":
    "bg-[var(--status-hold-bg)] text-[var(--status-hold-fg)] border-[var(--status-hold-border)]",
  Blocked:
    "bg-[var(--status-blocked-bg)] text-[var(--status-blocked-fg)] border-[var(--status-blocked-border)]",
};

export function StatusBadge({
  status,
  onClick,
  className,
}: {
  status: string;
  onClick?: (next: string) => void;
  className?: string;
}) {
  const style = STATUS_STYLES[status] || STATUS_STYLES["On Hold"];

  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(nextStatus(status));
      }}
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap border",
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        !onClick && "cursor-default",
        style,
        className
      )}
      title={onClick ? "Click to change status" : undefined}
    >
      {status}
    </button>
  );
}

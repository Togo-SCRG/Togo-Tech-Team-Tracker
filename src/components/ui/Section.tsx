import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Titled panel for the detail pages. Before this, each section on the project
 * page styled its own heading — some as hairline-underlined labels, some as
 * bare `section-label` text — so the page read as a loose stack rather than a
 * set of related blocks. `tone="danger"` tints the frame for blockers and
 * destructive areas.
 */
export function Section({
  title,
  icon: Icon,
  count,
  action,
  tone = "default",
  bodyClassName,
  className,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  count?: number;
  action?: React.ReactNode;
  tone?: "default" | "danger";
  bodyClassName?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const danger = tone === "danger";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-md border bg-togo-surface",
        danger ? "border-[var(--status-blocked-border)]" : "border-togo-border",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 border-b px-4 py-3",
          danger ? "border-[var(--status-blocked-border)]" : "border-togo-border"
        )}
      >
        <h2
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest",
            danger ? "text-[var(--status-blocked-fg)]" : "text-togo-blue"
          )}
        >
          {Icon && <Icon size={13} />}
          {title}
        </h2>
        {count !== undefined && (
          <span className="tnum rounded bg-togo-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-togo-muted">
            {count}
          </span>
        )}
        {action && <div className="ml-auto flex items-center gap-2">{action}</div>}
      </div>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

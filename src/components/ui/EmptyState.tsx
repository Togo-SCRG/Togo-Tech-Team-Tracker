import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Every list/table in the app needs an "there's nothing here" state. Before
// this component each one hand-rolled a centered grey paragraph, which gave
// the user no icon to anchor on and — more importantly — no way forward.
// An EmptyState always explains *why* it's empty and offers the next action.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-togo-surface border border-togo-border rounded-md px-6 py-12 flex flex-col items-center text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-togo-surface-2 border border-togo-border">
          <Icon size={20} className="text-togo-faint" />
        </div>
      )}
      <p className="text-sm font-semibold text-togo-white">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs leading-relaxed text-togo-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

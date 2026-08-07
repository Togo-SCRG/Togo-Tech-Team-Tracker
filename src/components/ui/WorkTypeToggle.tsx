"use client";

import { FolderKanban, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkType } from "@/lib/workType";

const OPTIONS: { key: WorkType; label: string; icon: typeof FolderKanban; hint: string }[] = [
  { key: "project", label: "Project", icon: FolderKanban, hint: "Counts towards a project's hours and status" },
  { key: "task", label: "Task", icon: ListTodo, hint: "Meetings, admin, support — not tied to a project" },
];

/**
 * Whether this entry is against a project or a standalone task.
 *
 * Shared by the three forms that log work, so the choice looks and behaves the
 * same whether you're starting a timer, logging time by hand, or writing a daily
 * update. Locked when the form is already tied to a project — the project page's
 * own timer can't sensibly log a task.
 */
export function WorkTypeToggle({
  value,
  onChange,
  disabled = false,
}: {
  value: WorkType;
  onChange: (value: WorkType) => void;
  disabled?: boolean;
}) {
  if (disabled) return null;

  return (
    <div
      role="radiogroup"
      aria-label="What this is logged against"
      className="inline-flex items-center gap-0.5 rounded-md border border-togo-border bg-togo-surface-2 p-0.5"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.hint}
            onClick={() => onChange(option.key)}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
              active ? "bg-togo-blue text-white" : "text-togo-muted hover:text-togo-white"
            )}
          >
            <Icon size={12} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

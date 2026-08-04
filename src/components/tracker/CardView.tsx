"use client";

import { AlertTriangle, ArrowRight, Clock } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateShort } from "@/lib/utils";
import { isRealBlocker } from "@/lib/blockers";
import type { DailyUpdateItem } from "@/types";

export function CardView({
  updates,
  onCardClick,
  onStatusChange,
  canEdit,
}: {
  updates: DailyUpdateItem[];
  onCardClick: (u: DailyUpdateItem) => void;
  onStatusChange: (u: DailyUpdateItem, status: string) => void;
  canEdit: (u: DailyUpdateItem) => boolean;
}) {
  if (updates.length === 0) {
    return <EmptyState title="No updates logged for this date range." />;
  }

  const grouped = updates.reduce<Record<string, DailyUpdateItem[]>>((acc, u) => {
    acc[u.project] = acc[u.project] || [];
    acc[u.project].push(u);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([project, items]) => (
        <section key={project}>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="section-label">{project}</h2>
            <span className="tnum rounded bg-togo-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-togo-muted">
              {items.length}
            </span>
            <div className="h-px flex-1 bg-togo-border" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((u) => {
              const editable = canEdit(u);
              return (
                <article
                  key={u.id}
                  onClick={() => onCardClick(u)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onCardClick(u);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${editable ? "Edit" : "View"} update: ${u.update || project}`}
                  className="card-hover flex cursor-pointer flex-col gap-3 rounded-md border border-togo-border bg-togo-surface p-4 hover:border-togo-blue"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar name={u.user.name} avatarUrl={u.user.avatarUrl} size="sm" className="shrink-0" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-togo-white">{u.user.name}</div>
                        <div className="flex items-center gap-1 text-[10px] text-togo-faint">
                          <Clock size={10} />
                          {formatDateShort(u.date)}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={u.status} onClick={editable ? (s) => onStatusChange(u, s) : undefined} />
                  </div>

                  <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-togo-muted">
                    {u.update || <span className="italic text-togo-faint">No update provided.</span>}
                  </p>

                  {u.whatsLeft && (
                    <div className="flex items-start gap-1.5 border-t border-togo-border pt-2.5 text-xs text-togo-faint">
                      <ArrowRight size={12} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{u.whatsLeft}</span>
                    </div>
                  )}

                  {/* A "N/A" or "None" answer gets no red panel and no warning
                      triangle — it says nothing is blocking, so styling it as an
                      alert reads as the opposite. Shown as plain text so it's
                      still clear the question was answered. */}
                  {u.blockers &&
                    (isRealBlocker(u.blockers) ? (
                      <div className="flex items-start gap-1.5 rounded border border-[var(--status-blocked-border)] bg-[var(--status-blocked-bg)] px-2 py-1.5 text-xs text-[var(--status-blocked-fg)]">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                        <span className="whitespace-pre-line">{u.blockers}</span>
                      </div>
                    ) : (
                      <div className="border-t border-togo-border pt-2.5 text-xs text-togo-faint">
                        <span className="whitespace-pre-line">{u.blockers}</span>
                      </div>
                    ))}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Users } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { cn, formatMinutes, formatDateShort } from "@/lib/utils";
import type { TimeEntryItem } from "@/types";

interface Row {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  minutes: number;
  entries: number;
}

/**
 * The "Total logged" card, with the per-person breakdown behind it.
 *
 * The card answers "how much time has gone into this?" but not "whose", which is
 * the next question every time. Clicking it opens the split by team member, with
 * a date range so you can ask about a sprint or a month rather than all time.
 *
 * The all-time total comes from the server render, so the card is correct on
 * first paint; the breakdown is fetched when the modal opens, because most
 * visits never need it.
 */
export function ProjectTotalLogged({
  projectName,
  totalMinutes,
}: {
  projectName: string;
  /** All-time total, computed server-side. */
  totalMinutes: number;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const load = useCallback(async () => {
    setRows(null);
    const params = new URLSearchParams({ project: projectName });
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const res = await fetch(`/api/time-entries?${params}`);
    if (!res.ok) {
      setRows([]);
      return;
    }
    const data = await res.json();
    const entries: TimeEntryItem[] = data.entries || [];

    // Group in the client rather than adding an aggregate endpoint: the entries
    // for one project are already a small set, and the date filter is applied
    // server-side so we're not pulling the whole history to add it up.
    const byUser = new Map<string, Row>();
    for (const e of entries) {
      const existing = byUser.get(e.userId);
      if (existing) {
        existing.minutes += e.durationMinutes;
        existing.entries += 1;
      } else {
        byUser.set(e.userId, {
          userId: e.userId,
          name: e.user?.name || "Someone",
          avatarUrl: e.user?.avatarUrl ?? null,
          minutes: e.durationMinutes,
          entries: 1,
        });
      }
    }
    setRows([...byUser.values()].sort((a, b) => b.minutes - a.minutes));
  }, [projectName, from, to]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const rangeLabel = from && to ? `${formatDateShort(from)} – ${formatDateShort(to)}` : "All time";
  const shown = rows?.reduce((sum, r) => sum + r.minutes, 0) ?? 0;
  // Shares of the filtered total, so the bars compare people to each other
  // rather than to the all-time figure on the card.
  const largest = rows?.length ? Math.max(...rows.map((r) => r.minutes)) : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="See the split by team member"
        className="card-hover flex flex-col rounded-md border border-togo-border bg-togo-surface p-4 text-left transition-colors hover:border-togo-blue"
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-xs text-togo-muted">Total logged</p>
          <Clock size={13} className="shrink-0 text-togo-faint" />
        </div>
        <div className="tnum text-3xl font-extrabold leading-none text-togo-white">
          {totalMinutes > 0 ? formatMinutes(totalMinutes) : "0h"}
        </div>
        <p className="mt-auto pt-2 text-[10px] text-togo-muted">
          {totalMinutes > 0 ? "Click to see it by member" : "No time logged yet"}
        </p>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Time by member" className="max-w-2xl">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-togo-muted">
              {projectName} · <span className="text-togo-white">{rangeLabel}</span>
              {rows && (
                <>
                  {" · "}
                  <span className="tnum font-semibold text-togo-blue">{formatMinutes(shown)}</span> total
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              <DateRangePicker
                from={from || todayISO()}
                to={to || todayISO()}
                onApply={(nextFrom, nextTo) => {
                  setFrom(nextFrom);
                  setTo(nextTo);
                }}
              />
              {(from || to) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setFrom("");
                    setTo("");
                  }}
                >
                  All time
                </Button>
              )}
            </div>
          </div>

          {rows === null ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-12 rounded-md" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No time logged in this range"
              description="Widen the date range, or clear it to see every session."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <ul className="max-h-[50vh] divide-y divide-togo-border overflow-y-auto rounded-md border border-togo-border">
              {rows.map((r) => (
                <li key={r.userId} className="flex items-center gap-3 px-3 py-2.5">
                  <Avatar name={r.name} avatarUrl={r.avatarUrl} size="sm" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-togo-white">{r.name}</div>
                    <div className="mt-1">
                      <ProgressBar
                        value={largest > 0 ? Math.round((r.minutes / largest) * 100) : 0}
                        label={`${r.name}: ${formatMinutes(r.minutes)}`}
                        className="h-1.5"
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={cn("tnum text-sm font-bold text-togo-blue")}>{formatMinutes(r.minutes)}</div>
                    <div className="tnum text-[10px] text-togo-faint">
                      {r.entries} {r.entries === 1 ? "session" : "sessions"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </>
  );
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, Square, Download, Timer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { StartTimerModal } from "./StartTimerModal";
import { TimeEntryModal } from "./TimeEntryModal";
import { PhaseBadge } from "./PhaseBadge";
import { Pagination } from "@/components/ui/Pagination";
import { ColumnsMenu } from "@/components/ui/ColumnsMenu";
import { Section } from "@/components/ui/Section";
import { useActiveTimer } from "@/lib/useActiveTimer";
import { cn, formatDateShort, formatElapsed, formatMinutes, toDateInputValue } from "@/lib/utils";
import { downloadExcel } from "@/lib/exportExcel";
import { usePagination } from "@/lib/usePagination";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { can } from "@/lib/capabilities";
import { useColumns } from "@/lib/useColumns";
import type { MemberItem, TimeEntryItem } from "@/types";

export function ProjectTimeSection({ projectName }: { projectName: string }) {
  const { active, elapsedSeconds, saving: stopping, start, stop } = useActiveTimer();
  const { currentUser } = useCurrentUser();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [entries, setEntries] = useState<TimeEntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntryItem | null>(null);
  const { visible: columnVisibility, isVisible, toggle: toggleColumn } = useColumns("project-time");

  // "Name" identifies the row, so it isn't offered as hideable.
  const TIME_COLUMNS = [
    { key: "date", label: "Date" },
    { key: "duration", label: "Duration" },
    { key: "phase", label: "Phase" },
    { key: "note", label: "What Was Done" },
  ];

  const loadEntries = useCallback(async () => {
    const res = await fetch(`/api/time-entries?project=${encodeURIComponent(projectName)}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
    }
  }, [projectName]);

  useEffect(() => {
    async function init() {
      const membersRes = await fetch("/api/members");
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members);
      }
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  function canEdit(e: TimeEntryItem) {
    if (!can(currentUser?.capabilities, "work.time.track")) return false;
    return e.userId === currentUser?.id || can(currentUser?.capabilities, "work.update.others");
  }

  function openEdit(e: TimeEntryItem) {
    if (!canEdit(e)) return;
    setEditingEntry(e);
    setLogModalOpen(true);
  }

  function openLog() {
    setEditingEntry(null);
    setLogModalOpen(true);
  }

  async function handleExport() {
    const header = ["Name", "Date", "Duration", "Phase", "What Was Done"];
    const rows = entries.map((e) => [
      e.user.name,
      formatDateShort(e.date),
      formatMinutes(e.durationMinutes),
      e.phase || "",
      e.note || "",
    ]);
    await downloadExcel(`${projectName}_time_${toDateInputValue(new Date())}.xlsx`, "Time", header, rows);
  }

  const isTimingThisProject = active?.project === projectName;
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    paged: pagedEntries,
  } = usePagination(entries);

  const totalLogged = entries.reduce((sum, e) => sum + e.durationMinutes, 0);
  const canLogWork = can(currentUser?.capabilities, "work.time.track");

  return (
    <Section
      title="Time tracking & logs"
      icon={Timer}
      count={entries.length}
      action={
        <>
          {totalLogged > 0 && <span className="tnum text-xs text-togo-faint">{formatMinutes(totalLogged)}</span>}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            disabled={entries.length === 0}
            title="Export these entries to Excel (.xlsx)"
            aria-label="Export to Excel"
          >
            <Download size={14} />
          </Button>
          {/* Clients read the time log; they don't add to it. Export stays —
              taking a copy of what's already there is still watching. */}
          {canLogWork && (
            <>
              <Button variant="secondary" size="sm" onClick={openLog}>
                Log manually
              </Button>
              {/* The timer is global — it keeps running across pages, so this
                  control reflects whichever project it's actually attached to. */}
              {active ? (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => stop(loadEntries)}
                  disabled={stopping}
                  title={
                    isTimingThisProject
                      ? "Stop the timer and log the session here"
                      : `Running on “${active.project}” — stopping logs the time there, not here`
                  }
                >
                  <Square size={13} />
                  <span className="tabular-nums">{stopping ? "Saving..." : formatElapsed(elapsedSeconds)}</span>
                </Button>
              ) : (
                <Button size="sm" onClick={() => setStartModalOpen(true)}>
                  <Play size={13} /> Start timer
                </Button>
              )}
            </>
          )}
          {/* Last, at the very right — same position as on the other tables, so
              the control sits in a predictable place across the app. */}
          <ColumnsMenu columns={TIME_COLUMNS} visible={columnVisibility} onToggle={toggleColumn} />
        </>
      }
      bodyClassName="p-4 space-y-4"
    >
      {active && !isTimingThisProject && (
        <p className="rounded border border-[var(--status-hold-border)] bg-[var(--status-hold-bg)] px-3 py-2 text-xs text-[var(--status-hold-fg)]">
          The running timer belongs to &ldquo;{active.project}&rdquo;. Stopping it logs that time there, not against
          this project.
        </p>
      )}

      {loading ? (
        <SkeletonTable rows={4} label="Loading time entries" />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Timer}
          title="No time logged yet"
          description="Start the timer while you work, or log a past session manually — logged time rolls up into the project's weekly cap."
          className="border-0 bg-transparent py-6"
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-togo-border bg-togo-surface">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="sticky top-0 z-10 bg-togo-surface">
              <tr className="border-b border-togo-border text-left">
                <th scope="col" className="section-label whitespace-nowrap px-4 py-3">
                  Name
                </th>
                {TIME_COLUMNS.filter((c) => isVisible(c.key)).map((c) => (
                  <th key={c.key} scope="col" className="section-label whitespace-nowrap px-4 py-3">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-togo-border">
              {pagedEntries.map((e) => {
                const editable = canEdit(e);
                return (
                  <tr
                    key={e.id}
                    onClick={() => openEdit(e)}
                    onKeyDown={(ev) => {
                      if (editable && (ev.key === "Enter" || ev.key === " ")) {
                        ev.preventDefault();
                        openEdit(e);
                      }
                    }}
                    tabIndex={editable ? 0 : undefined}
                    role={editable ? "button" : undefined}
                    aria-label={editable ? `Edit ${formatMinutes(e.durationMinutes)} entry by ${e.user.name}` : undefined}
                    // Hover tracks the row under the cursor whether or not you
                    // can edit it — it's feedback about where you are, not an
                    // affordance. The pointer and focus ring stay conditional.
                    className={cn(
                      "transition-colors hover:bg-[var(--togo-hover)]",
                      editable &&
                        "cursor-pointer focus-visible:bg-[var(--togo-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-togo-blue"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <Avatar name={e.user.name} avatarUrl={e.user.avatarUrl} size="sm" />
                        <span className="font-semibold text-togo-white">{e.user.name}</span>
                      </div>
                    </td>
                    {isVisible("date") && (
                      <td className="tnum whitespace-nowrap px-4 py-3 text-togo-muted">{formatDateShort(e.date)}</td>
                    )}
                    {isVisible("duration") && (
                      <td className="tnum whitespace-nowrap px-4 py-3 font-semibold text-togo-blue">
                        {formatMinutes(e.durationMinutes)}
                      </td>
                    )}
                    {isVisible("phase") && (
                      <td className="px-4 py-3">
                        <PhaseBadge phase={e.phase || ""} />
                      </td>
                    )}
                    {isVisible("note") && (
                      <td className="max-w-xs px-4 py-3 text-togo-muted">
                        {e.note || <span className="text-togo-faint">—</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <StartTimerModal
        open={startModalOpen}
        onClose={() => setStartModalOpen(false)}
        onStart={(project, phase, workDone) => {
          start(project, phase, workDone);
          setStartModalOpen(false);
        }}
        lockProject={projectName}
      />

      {canLogWork && currentUser && (
        <TimeEntryModal
          open={logModalOpen}
          onClose={() => setLogModalOpen(false)}
          onSaved={loadEntries}
          currentUser={currentUser}
          members={members}
          editingEntry={editingEntry}
          defaultDate={toDateInputValue(new Date())}
          lockProject={projectName}
        />
      )}
    </Section>
  );
}

"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SortableHeader } from "@/components/ui/SortableHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, formatDateShort } from "@/lib/utils";
import type { SortState } from "@/lib/useSort";
import { TEN_ROWS_TRACKER } from "@/lib/tableHeights";
import type { DailyUpdateItem } from "@/types";

function hoursLabel(minutes: number | undefined): string {
  if (!minutes) return "—";
  const h = minutes / 60;
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
}

export type TrackerSortKey =
  | "project"
  | "task"
  | "engineer"
  | "blockers"
  | "status"
  | "hours"
  | "date";

interface TrackerColumn {
  key: TrackerSortKey;
  label: string;
  width?: string;
  /** The task description is the row's content — hiding it leaves nothing. */
  fixed?: boolean;
}

/** Display order. Project leads, then the description, then the detail. */
const TRACKER_COLUMNS: TrackerColumn[] = [
  { key: "project", label: "Project", width: "w-40" },
  { key: "task", label: "Task", fixed: true },
  { key: "engineer", label: "Engineer", width: "w-32" },
  { key: "blockers", label: "Blockers", width: "w-48" },
  { key: "status", label: "Status", width: "w-28" },
  { key: "hours", label: "Hrs", width: "w-16" },
  { key: "date", label: "Date", width: "w-28" },
];

/** What the Columns menu offers — everything except the fixed column. */
export const TRACKER_TOGGLEABLE = TRACKER_COLUMNS.filter((c) => !c.fixed).map((c) => ({
  key: c.key as string,
  label: c.label,
}));

// Rows arrive already sorted and paginated. Sorting has to happen upstream of
// pagination — sorting here would only reorder the visible page, which reads
// as the table quietly ignoring most of the data.
const BULLET = "•";

/** The task cell is two lines, so two bullets. */
const MAX_BULLETS = 2;

/**
 * Text typed in the bullet editor comes back as "• one\n• two". Rendering that
 * straight into a cell collapsed the newlines, so a three-item list read as one
 * run-on sentence with stray dots in it. When every non-empty line starts with a
 * bullet it's a real list, so it's rendered as one; anything else is left as
 * plain text.
 *
 * Either way it's two lines. A long update could otherwise make one row twenty
 * lines tall and push everything else off screen — the full text is one click
 * away in the row's detail view, and on hover as a tooltip.
 */
function renderBulletText(text: string | null | undefined) {
  const value = text?.trim();
  if (!value) return <span className="text-togo-faint">—</span>;

  const lines = value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const isList = lines.length > 0 && lines.every((l) => l.startsWith(BULLET));

  if (!isList) {
    // line-clamp adds its own ellipsis, and only when the text actually
    // overflows — a one-line update doesn't get a misleading "…".
    return (
      <span className="line-clamp-2 whitespace-pre-line" title={value}>
        {value}
      </span>
    );
  }

  const shown = lines.slice(0, MAX_BULLETS);
  const hasMore = lines.length > shown.length;

  return (
    <ul title={value}>
      {shown.map((line, i) => (
        <li key={i} className="flex gap-1.5">
          <span aria-hidden className="shrink-0 text-togo-faint">
            {BULLET}
          </span>
          {/* One line each, so two bullets is exactly two lines. The glyph is
              drawn by the marker above, so the one baked into the text is
              stripped — otherwise every row shows two. */}
          <span className="line-clamp-1 min-w-0">{line.slice(BULLET.length).trim()}</span>
          {/* Trails the last visible bullet rather than taking a third line,
              which would defeat the two-line cap. */}
          {hasMore && i === shown.length - 1 && (
            <span aria-label={`${lines.length - shown.length} more`} className="shrink-0 text-togo-faint">
              …
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function TableView({
  updates,
  onRowClick,
  onStatusChange,
  onDelete,
  canEdit,
  minutesByKey = {},
  sort,
  onToggleSort,
  isVisible,
}: {
  updates: DailyUpdateItem[];
  onRowClick: (u: DailyUpdateItem) => void;
  onStatusChange: (u: DailyUpdateItem, status: string) => void;
  onDelete: (u: DailyUpdateItem) => void;
  canEdit: (u: DailyUpdateItem) => boolean;
  minutesByKey?: Record<string, number>;
  sort: SortState<TrackerSortKey>;
  onToggleSort: (key: TrackerSortKey) => void;
  /** From useColumns — which optional columns to render. */
  isVisible: (key: string) => boolean;
}) {
  const minutesFor = (u: DailyUpdateItem) => minutesByKey[`${u.userId}|${u.project}`] || 0;

  if (updates.length === 0) {
    return <EmptyState title="No tasks logged for this date range." />;
  }

  const shown = TRACKER_COLUMNS.filter((c) => c.fixed || isVisible(c.key));
  const anyDeletable = updates.some((u) => canEdit(u));

  function renderCell(c: TrackerColumn, u: DailyUpdateItem) {
    switch (c.key) {
      case "project":
        return <span className="whitespace-nowrap font-medium text-togo-white">{u.project}</span>;

      case "task":
        // The avatar lives in its own leading column, not in here — see below.
        return <div className="min-w-0 text-togo-muted">{renderBulletText(u.update)}</div>;

      case "engineer":
        return (
          <span className="whitespace-nowrap text-togo-muted" title={u.user.name}>
            {u.user.name.split(" ")[0]}
          </span>
        );

      case "blockers":
        return u.blockers ? (
          <span className="flex items-start gap-1 text-xs text-[var(--status-blocked-fg)]">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            <span className="min-w-0 whitespace-pre-line">{u.blockers}</span>
          </span>
        ) : (
          <span className="text-togo-faint">—</span>
        );


      case "status":
        return <StatusBadge status={u.status} onClick={canEdit(u) ? (s) => onStatusChange(u, s) : undefined} />;

      case "hours":
        return <span className="tnum whitespace-nowrap text-togo-muted">{hoursLabel(minutesFor(u))}</span>;

      case "date":
        return <span className="tnum whitespace-nowrap text-togo-faint">{formatDateShort(u.date)}</span>;
    }
  }

  // No border or background of its own — the tracker page wraps this in a panel
  // that supplies the frame, header and pagination footer.
  return (
    <div className={`overflow-x-auto ${TEN_ROWS_TRACKER}`}>
      <table className="w-full min-w-[900px] text-sm">
        {/* Header stays put while long lists scroll, so you never lose track
            of which column you're reading. */}
        <thead className="sticky top-0 z-10 bg-togo-surface">
          <tr className="border-b border-togo-border text-left">
            {/* Whose update this is, at the very left of the row. Deliberately
                not sortable — the Engineer column already sorts by name, and a
                column of photos has no meaningful order. */}
            <th scope="col" className="w-10 py-2.5 pl-4 pr-0">
              <span className="sr-only">Engineer</span>
            </th>
            {shown.map((c) => (
              <SortableHeader
                key={c.key}
                label={c.label}
                active={sort.key === c.key}
                direction={sort.direction}
                onClick={() => onToggleSort(c.key)}
                className={c.width}
              />
            ))}
            {anyDeletable && (
              <th scope="col" className="w-10 px-2 py-2.5">
                <span className="sr-only">Delete</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-togo-border">
          {updates.map((u) => {
            const editable = canEdit(u);
            return (
              <tr key={u.id} className="group transition-colors hover:bg-[var(--togo-hover)]">
                {/* Every row opens — the caller decides whether that's the
                    editor or a read-only detail view. Rows used to be inert
                    unless you could edit them, which left anyone looking at
                    someone else's work with truncated cells and no way to read
                    the rest. */}
                {/* Leading avatar column. This is also the row's single focus
                    stop — with nine cells all focusable, tabbing through a page
                    meant dozens of stops before reaching the pagination. */}
                <td
                  onClick={() => onRowClick(u)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowClick(u);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${editable ? "Edit" : "View"} update: ${u.update || u.project}`}
                  className="cursor-pointer py-2.5 pl-4 pr-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-togo-blue"
                >
                  <Avatar
                    name={u.user.name}
                    avatarUrl={u.user.avatarUrl}
                    size="sm"
                    title={u.user.name}
                    className="!h-7 !w-7 !text-[10px]"
                  />
                </td>

                {shown.map((c) => (
                  <td
                    key={c.key}
                    // Cells open the row; the delete button has its own cell
                    // so clicking it can't also open the row.
                    onClick={() => onRowClick(u)}
                    className="cursor-pointer px-4 py-2.5"
                  >
                    {renderCell(c, u)}
                  </td>
                ))}

                {anyDeletable && (
                  <td className="px-2 py-2.5">
                    {editable && (
                      <button
                        onClick={() => onDelete(u)}
                        title="Delete this update"
                        aria-label={`Delete update: ${u.update || u.project}`}
                        className="rounded p-1.5 text-[var(--status-blocked-fg)] transition-colors hover:bg-[var(--status-blocked-bg)]"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

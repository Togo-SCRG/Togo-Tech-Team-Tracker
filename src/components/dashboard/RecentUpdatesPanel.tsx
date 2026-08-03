"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import { usePagination } from "@/lib/usePagination";

export interface RecentUpdateRow {
  id: string;
  project: string;
  update: string | null;
  status: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
  /** Pre-formatted server-side — the hours total spans a whole project. */
  hours: string;
}

/**
 * The dashboard's recent-updates table, paginated.
 *
 * Client-side because the page itself is a server component and paging here
 * shouldn't cost a round trip — the rows are already loaded.
 *
 * The grid template is repeated on the header and every row rather than being
 * a real <table>: the two text columns need minmax(0,…) to truncate, and the
 * row is a Link, which can't wrap <tr>.
 */
const GRID = "grid grid-cols-[26px_minmax(0,1fr)_minmax(0,1fr)_128px_72px_26px] gap-2";

export function RecentUpdatesPanel({ rows }: { rows: RecentUpdateRow[] }) {
  const { page, setPage, pageSize, setPageSize, totalPages, totalItems, paged } = usePagination(rows);

  return (
    <>
      {/* Column order matches the tracker table: who, then which project, then
          what they did.

          Status and Hrs are content-sized, and the row ends with a spacer the
          same width as the leading avatar column — so Hrs clears the right edge
          by the same margin Project has on the left, instead of either hugging
          the edge or floating far off it. */}
      <div className={`${GRID} px-4 py-1.5 text-[10px] uppercase tracking-wider text-togo-faint`}>
        {/* An outer span is needed to hold the grid cell — `sr-only` is
            position:absolute, so on its own it takes no space and every
            following header slid one column left, putting HRS above the
            status badges. */}
        <span>
          <span className="sr-only">Engineer</span>
        </span>
        <span>Project</span>
        <span>Task</span>
        {/* Matches the log-update form and the tracker table: this status is the
            project's, not the individual row's. */}
        <span>Project status</span>
        <span>Hrs</span>
        <span />
      </div>

      {/* No fixed height: the panel is as tall as the rows it's showing. It used
          to be a fixed ten-row box so the Active projects column had a stable
          height to match — that column now sizes itself, so all the fixed height
          did was leave dead space below on a quiet day. */}
      <div>
        {paged.map((u) => (
          <Link
            key={u.id}
            href="/daily-updates"
            className={`${GRID} items-center border-t border-togo-border px-4 py-2 transition-colors hover:bg-[var(--togo-hover)]`}
          >
            <Avatar
              name={u.authorName || "?"}
              avatarUrl={u.authorAvatarUrl}
              size="sm"
              title={u.authorName || undefined}
              className="!h-6 !w-6 !text-[10px]"
            />
            <span className="truncate text-xs font-medium text-togo-white">{u.project}</span>
            <span className="truncate text-xs text-togo-muted">
              {u.update || <span className="text-togo-faint">—</span>}
            </span>
            {/* justify-self-start or the badge stretches to fill its grid cell —
                grid items default to stretch, which is why the coloured
                background ran the full column width. */}
            <StatusBadge status={u.status} className="justify-self-start" />
            <span className="tnum text-[11px] text-togo-muted">{u.hours}</span>
            <span />
          </Link>
        ))}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        className="border-t border-togo-border px-4 py-2.5"
      />
    </>
  );
}

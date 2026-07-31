"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50, 100];

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}) {
  // Typed page number, kept separate from `page` so a half-typed value doesn't
  // navigate on every keystroke.
  const [draft, setDraft] = useState(String(page));
  useEffect(() => setDraft(String(page)), [page]);

  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);

  function commitDraft() {
    const n = Number(draft);
    if (!Number.isFinite(n) || n < 1) {
      setDraft(String(page));
      return;
    }
    const clamped = Math.min(Math.max(1, Math.floor(n)), totalPages);
    setDraft(String(clamped));
    if (clamped !== page) onPageChange(clamped);
  }

  const arrowBtn =
    "flex items-center justify-center rounded-md border border-togo-border p-1 text-togo-muted transition-colors hover:border-togo-blue hover:text-togo-blue disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-togo-border disabled:hover:text-togo-muted";

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-col items-center justify-between gap-3 sm:flex-row", className)}
    >
      <p className="tnum whitespace-nowrap text-xs text-togo-faint">
        Showing{" "}
        <span className="font-semibold text-togo-muted">
          {start}–{end}
        </span>{" "}
        of {totalItems}
      </p>

      {/* Always shown, even at "1 of 1" — the control disappearing on short
          lists is disorienting, and it's where you read which page you're on,
          not just how you move. A compact jump beats numbered buttons: it stays
          the same width whether there are 2 pages or 200, and typing a number
          beats clicking through to page 40. Arrows disable at the ends. */}
      <div className="flex items-center gap-1.5 text-xs text-togo-faint">
        <span className="whitespace-nowrap">Page:</span>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={arrowBtn}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
            }
            if (e.key === "Escape") setDraft(String(page));
          }}
          aria-label={`Page number, ${totalPages} total`}
          className="tnum w-10 rounded-md border border-togo-border bg-togo-surface-2 px-1 py-1 text-center text-xs font-semibold text-togo-white outline-none focus:border-togo-blue"
        />
        <span className="tnum whitespace-nowrap">of {totalPages}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={arrowBtn}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Far right, always present — a control that appears only once a list is
          long enough is hard to find when you need it. */}
      {onPageSizeChange && (
        <label className="flex shrink-0 items-center gap-2 text-xs text-togo-faint">
          <span className="whitespace-nowrap">Show</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
            className="tnum rounded-md border border-togo-border bg-togo-surface px-2 py-1.5 text-xs text-togo-white outline-none focus:border-togo-blue"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
    </nav>
  );
}

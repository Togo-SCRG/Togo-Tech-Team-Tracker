"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The shared look and date maths behind every calendar in the app.
 *
 * The single-date picker and the range picker are separate components because
 * their *interactions* genuinely differ — one endpoint versus two, with hover
 * and in-range states. Their chrome shouldn't differ though, and it did: two
 * weekday vocabularies, two month/year controls, two day-cell styles. Anything
 * purely visual lives here so the two can't drift again.
 */

export const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// UTC throughout, matching how dates are stored and formatted elsewhere in the
// app — local-timezone math here produces off-by-one days.
export function parseISO(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISO(a) === toISO(b);
}

/** "Mon, Aug 17" — the headline at the top of a picker. */
export function formatHeadline(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Aug 17, 2026" — what gets written back into a field. */
export function formatPickedDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Day cells for one month, with leading blanks before the 1st. Blanks rather
 * than trailing days from the neighbouring months: a greyed-out day is still
 * clickable-looking, and the reference design shows an empty run.
 */
export function useMonthGrid(year: number, month: number): (Date | null)[] {
  return useMemo(() => {
    const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(Date.UTC(year, month, d)));
    return cells;
  }, [year, month]);
}

/** The panel shell: fixed width, border, shadow. */
export function CalendarPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "w-[280px] overflow-hidden rounded-lg border border-togo-border bg-togo-surface shadow-[var(--shadow-modal)]",
        className
      )}
    >
      {children}
    </div>
  );
}

/** "Select date" over the current selection, in large type. */
export function CalendarHeader({ label, headline }: { label: string; headline: string }) {
  return (
    <div className="border-b border-togo-border px-4 pb-3 pt-3">
      <p className="text-[11px] text-togo-faint">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold text-togo-white">{headline}</p>
    </div>
  );
}

/** "Month Year ▾" with a year grid, and the ‹ › month arrows. */
export function CalendarNav({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  const [yearOpen, setYearOpen] = useState(false);

  const years = useMemo(() => {
    const base = new Date().getUTCFullYear();
    return Array.from({ length: 12 }, (_, i) => base - 3 + i);
  }, []);

  function shiftMonth(delta: number) {
    const next = new Date(Date.UTC(year, month + delta, 1));
    onChange(next.getUTCFullYear(), next.getUTCMonth());
  }

  const arrow = "rounded p-1 text-togo-muted transition-colors hover:bg-togo-surface-2 hover:text-togo-white";

  return (
    <div className="relative mb-1 flex items-center justify-between">
      <button
        type="button"
        onClick={() => setYearOpen((o) => !o)}
        aria-expanded={yearOpen}
        className="flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-togo-white transition-colors hover:text-togo-blue"
      >
        {MONTHS[month]} {year}
        <ChevronDown size={13} className={cn("transition-transform", yearOpen && "rotate-180")} />
      </button>

      <div className="flex items-center gap-1">
        <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className={arrow}>
          <ChevronLeft size={16} />
        </button>
        <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className={arrow}>
          <ChevronRight size={16} />
        </button>
      </div>

      {yearOpen && (
        <div className="animate-fade-in absolute left-0 top-8 z-10 grid w-40 grid-cols-3 gap-1 rounded-md border border-togo-border bg-togo-surface p-2 shadow-[var(--shadow-modal)]">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                onChange(y, month);
                setYearOpen(false);
              }}
              className={cn(
                "tnum rounded px-1 py-1 text-xs transition-colors",
                y === year ? "bg-togo-blue text-white" : "text-togo-muted hover:bg-togo-blue/10"
              )}
            >
              {y}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CalendarWeekdays() {
  return (
    <>
      {WEEKDAYS.map((d, i) => (
        <div key={`${d}-${i}`} className="py-1 text-center text-[11px] font-medium text-togo-faint">
          {d}
        </div>
      ))}
    </>
  );
}

/**
 * One day. `inRange` paints the span between a range's two ends — square, so
 * consecutive days join into a continuous band rather than a row of circles.
 */
export function CalendarDay({
  date,
  selected,
  today,
  inRange,
  disabled,
  onClick,
}: {
  date: Date;
  selected?: boolean;
  today?: boolean;
  inRange?: boolean;
  disabled?: boolean;
  onClick: (date: Date) => void;
}) {
  return (
    <div className={cn("flex justify-center", inRange && !selected && "bg-togo-blue/10")}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onClick(date)}
        aria-pressed={selected}
        aria-label={formatPickedDate(date)}
        className={cn(
          "tnum flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors",
          selected && "bg-togo-blue font-semibold text-white",
          // Today is ringed rather than filled, so it stays legible when a
          // different day is selected.
          !selected && today && "text-togo-blue ring-1 ring-togo-blue",
          !selected && !today && !inRange && "text-togo-muted hover:bg-togo-blue/10 hover:text-togo-white",
          !selected && inRange && "text-togo-blue",
          disabled && "cursor-not-allowed opacity-30 hover:bg-transparent"
        )}
      >
        {date.getUTCDate()}
      </button>
    </div>
  );
}

/** Cancel / confirm, with an optional extra control on the left. */
export function CalendarFooter({
  onCancel,
  onConfirm,
  confirmLabel = "OK",
  confirmDisabled,
  left,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  left?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-togo-border px-3 py-2">
      <div>{left}</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-3 py-1.5 text-xs font-semibold text-togo-muted transition-colors hover:text-togo-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirmDisabled}
          className="rounded px-3 py-1.5 text-xs font-semibold text-togo-blue transition-colors hover:bg-togo-blue/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

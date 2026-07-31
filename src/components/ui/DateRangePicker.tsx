"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CalendarDay,
  CalendarFooter,
  CalendarHeader,
  CalendarNav,
  CalendarPanel,
  CalendarWeekdays,
  formatHeadline,
  formatPickedDate,
  isSameDay,
  parseISO,
  toISO,
  useMonthGrid,
} from "./calendar";

interface DateRangePickerProps {
  from: string;
  to: string;
  onApply: (from: string, to: string) => void;
}

/**
 * Two-ended date range, in the same panel as DatePicker — same header, month
 * nav, weekday row, and day cells (see ./calendar). Only the selection rules
 * differ: the first click sets the start, the second the end, and a third
 * starts over.
 */
export function DateRangePicker({ from, to, onApply }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [view, setView] = useState({ year: 0, month: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const todayISO = useMemo(() => toISO(new Date()), []);

  useEffect(() => {
    if (!open) return;
    function onOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  function openPicker() {
    const s = parseISO(from);
    const e = parseISO(to);
    setStart(s);
    // A one-day range opens with only the start set, so the next click extends
    // it rather than starting over.
    setEnd(isSameDay(s, e) ? null : e);
    setView({ year: s.getUTCFullYear(), month: s.getUTCMonth() });
    setOpen(true);
  }

  function handleDayClick(day: Date) {
    if (!start || end) {
      setStart(day);
      setEnd(null);
      return;
    }
    if (day.getTime() < start.getTime()) {
      setEnd(start);
      setStart(day);
    } else {
      setEnd(day);
    }
  }

  function handleToday() {
    const today = parseISO(todayISO);
    setStart(today);
    setEnd(null);
    setView({ year: today.getUTCFullYear(), month: today.getUTCMonth() });
  }

  function handleApply() {
    if (!start) return;
    onApply(toISO(start), toISO(end || start));
    setOpen(false);
  }

  const grid = useMonthGrid(view.year, view.month);

  // The headline doubles as the instruction — "pick an end date" only shows
  // while that's the click that's actually pending.
  let headline = "Pick a start date";
  if (start && !end) headline = `${formatHeadline(start)} — …`;
  else if (start && end) headline = `${formatHeadline(start)} — ${formatHeadline(end)}`;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
          open
            ? "border-togo-blue bg-togo-blue-muted text-togo-blue"
            : "border-togo-border bg-togo-surface text-togo-white hover:border-togo-blue"
        )}
      >
        <CalendarIcon size={16} />
        Date Range
      </button>

      {open && (
        <div className="animate-fade-in absolute z-30 mt-2">
          <CalendarPanel>
            <CalendarHeader label="Select date range" headline={headline} />

            <div className="px-3 pb-3 pt-2">
              <CalendarNav
                year={view.year}
                month={view.month}
                onChange={(year, month) => setView({ year, month })}
              />

              <div className="grid grid-cols-7 gap-y-1">
                <CalendarWeekdays />
                {grid.map((date, i) =>
                  date ? (
                    <CalendarDay
                      key={toISO(date)}
                      date={date}
                      selected={
                        (!!start && isSameDay(date, start)) || (!!end && isSameDay(date, end))
                      }
                      today={toISO(date) === todayISO}
                      inRange={
                        !!start &&
                        !!end &&
                        date.getTime() > start.getTime() &&
                        date.getTime() < end.getTime()
                      }
                      onClick={handleDayClick}
                    />
                  ) : (
                    <div key={`blank-${i}`} />
                  )
                )}
              </div>

              {start && !end && (
                <p className="mt-2 text-center text-[11px] text-togo-faint">
                  Pick an end date, or apply for {formatPickedDate(start)} alone.
                </p>
              )}
            </div>

            <CalendarFooter
              onCancel={() => setOpen(false)}
              onConfirm={handleApply}
              confirmLabel="Apply"
              confirmDisabled={!start}
              left={
                <button
                  type="button"
                  onClick={handleToday}
                  className="rounded px-2 py-1.5 text-xs font-semibold text-togo-muted transition-colors hover:text-togo-white"
                >
                  Today
                </button>
              }
            />
          </CalendarPanel>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDay,
  CalendarFooter,
  CalendarHeader,
  CalendarNav,
  CalendarPanel,
  CalendarWeekdays,
  formatHeadline,
  isSameDay,
  parseISO,
  toISO,
  useMonthGrid,
} from "./calendar";

export { formatPickedDate, toISO } from "./calendar";

/**
 * Single-date calendar panel. Renders the panel only — the caller positions it,
 * which keeps it usable as a popover, inside a modal, or inline.
 *
 * Separate from DateRangePicker on purpose: that one is a two-ended range with
 * its own selection rules, and folding both into one component would mean a
 * pile of conditionals for two genuinely different interactions. They share
 * their chrome through ./calendar so they still look identical.
 */
export function DatePicker({
  value,
  max,
  onSelect,
  onCancel,
}: {
  /** ISO date (yyyy-mm-dd) to preselect, or null. */
  value?: string | null;
  /** Latest selectable ISO date — used where a future date makes no sense. */
  max?: string;
  onSelect: (date: Date) => void;
  onCancel: () => void;
}) {
  const todayISO = useMemo(() => toISO(new Date()), []);
  const initial = value ? parseISO(value) : parseISO(todayISO);

  const [selected, setSelected] = useState<Date>(initial);
  const [view, setView] = useState({ year: initial.getUTCFullYear(), month: initial.getUTCMonth() });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const grid = useMonthGrid(view.year, view.month);

  return (
    <CalendarPanel>
      <CalendarHeader label="Select date" headline={formatHeadline(selected)} />

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
                selected={isSameDay(date, selected)}
                today={toISO(date) === todayISO}
                disabled={!!max && toISO(date) > max}
                onClick={setSelected}
              />
            ) : (
              <div key={`blank-${i}`} />
            )
          )}
        </div>
      </div>

      <CalendarFooter onCancel={onCancel} onConfirm={() => onSelect(selected)} />
    </CalendarPanel>
  );
}

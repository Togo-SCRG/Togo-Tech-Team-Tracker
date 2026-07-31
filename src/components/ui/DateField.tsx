"use client";

import { useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { DatePicker } from "./DatePicker";
import { PopoverPortal } from "./PopoverPortal";
import { formatPickedDate, parseISO, toISO } from "./calendar";

/**
 * A date input that opens the app's own calendar rather than the browser's.
 *
 * `<input type="date">` renders differently in every browser and ignores the
 * app's theme entirely, so a form using one looked nothing like the timeline
 * picker sitting a page away. This keeps the field styling of Input while the
 * popover is the same DatePicker used everywhere else.
 *
 * Value is ISO (yyyy-mm-dd) in and out, so it drops straight into the places
 * that were passing an ISO string to a native date input.
 */
export function DateField({
  id,
  value,
  onChange,
  max,
  required,
  className,
}: {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  /** Latest selectable ISO date. */
  max?: string;
  required?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className={cn("relative", className)}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-required={required}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-togo-border bg-togo-surface px-3 py-2 text-left text-sm text-togo-white outline-none transition focus:border-togo-blue focus:ring-2 focus:ring-togo-blue"
      >
        <span className={value ? undefined : "text-togo-faint"}>
          {value ? formatPickedDate(parseISO(value)) : "Pick a date"}
        </span>
        <CalendarDays size={15} className="shrink-0 text-togo-faint" />
      </button>

      {/* Both places this is used sit inside a modal, which is
          `overflow-y-auto` — an absolutely-positioned panel gets clipped by it
          and adds a scrollbar rather than floating over the form. */}
      <PopoverPortal
        anchorRef={triggerRef}
        open={open}
        onClose={() => setOpen(false)}
        width={280}
        height={400}
      >
        <DatePicker
          value={value || null}
          max={max}
          onSelect={(date) => {
            onChange(toISO(date));
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      </PopoverPortal>
    </div>
  );
}

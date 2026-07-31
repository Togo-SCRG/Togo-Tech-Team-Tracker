"use client";

import { useEffect, useRef } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A checkbox that belongs to the theme.
 *
 * A native `<input type="checkbox">` paints its own opaque white box that no
 * amount of colour classes reaches, which on a dark surface reads as a filled
 * square whether or not it's ticked. `appearance-none` removes that box, so the
 * control is transparent until checked; the tick is drawn on top.
 *
 * `indeterminate` isn't an attribute — it can only be set on the DOM node — so
 * it's applied in an effect and mirrored visually with a dash.
 */
export function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  /** Some but not all of the things this box covers are selected. */
  indeterminate?: boolean;
  onChange: () => void;
  /** Accessible name — these never have a visible text label. */
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);

  const showDash = !!indeterminate && !checked;

  return (
    <span className={cn("relative inline-flex h-4 w-4 shrink-0 items-center justify-center", className)}>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-label={label}
        title={label}
        className={cn(
          "peer h-4 w-4 cursor-pointer appearance-none rounded-[3px] border bg-transparent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-togo-blue",
          checked || showDash
            ? "border-togo-blue bg-togo-blue"
            : "border-togo-border-strong hover:border-togo-blue",
          disabled && "cursor-not-allowed opacity-50"
        )}
      />
      {/* pointer-events-none so the glyph never swallows the click. */}
      {checked && (
        <Check size={11} strokeWidth={3} className="pointer-events-none absolute text-white" />
      )}
      {showDash && <Minus size={11} strokeWidth={3} className="pointer-events-none absolute text-white" />}
    </span>
  );
}

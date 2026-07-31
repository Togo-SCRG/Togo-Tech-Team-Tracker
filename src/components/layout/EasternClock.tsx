"use client";

import { useEffect, useState } from "react";

/**
 * The date and time in US Eastern, for the topbar.
 *
 * Rendered client-side and only after mount. The server and the browser sit in
 * different timezones (and, by the time hydration runs, different seconds), so
 * formatting a clock during SSR guarantees a hydration mismatch. Empty first
 * paint is the cost; it lands within a frame.
 *
 * The zone is America/New_York rather than a fixed -05:00 so the offset follows
 * daylight saving, and the label is whatever that zone is actually called right
 * now — EST in winter, EDT in summer. Printing "EST" year-round would be wrong
 * for half of it.
 */
export function EasternClock({ className }: { className?: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    function tick() {
      const now = new Date();
      const date = now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "America/New_York",
      });
      const time = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
        timeZone: "America/New_York",
      });
      setLabel(`${date} · ${time}`);
    }

    tick();
    // Every 15s: the display is minute-precision, so this is fine-grained enough
    // that the minute never looks stale, without waking up every second.
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  if (!label) return null;

  return (
    <span className={className} suppressHydrationWarning>
      {label}
    </span>
  );
}

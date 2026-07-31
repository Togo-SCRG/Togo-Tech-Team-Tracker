"use client";

import { useEffect, useState } from "react";

/**
 * Which table columns are visible, remembered per table.
 *
 * Stored as the set of *hidden* keys rather than the visible ones: a column
 * added later then defaults to shown instead of silently disappearing for
 * anyone who had already customised that table.
 *
 * Read in an effect, not during render — reading localStorage while rendering
 * produces different markup on the server and the client, which React reports
 * as a hydration mismatch.
 */
export function useColumns(storageKey: string, defaultHidden: string[] = []) {
  const [hidden, setHidden] = useState<string[]>(defaultHidden);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`columns:${storageKey}`);
      if (raw) setHidden(JSON.parse(raw));
    } catch {
      // Corrupt or unreadable — keep the defaults.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function toggle(key: string) {
    setHidden((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        localStorage.setItem(`columns:${storageKey}`, JSON.stringify(next));
      } catch {
        // Private browsing can reject writes; the in-memory state is still right.
      }
      return next;
    });
  }

  /** Shape ColumnsMenu expects: `{ [key]: boolean }`. */
  const visible = Object.fromEntries(
    // Derived from `hidden`, so any key not listed is visible by default.
    hidden.map((k) => [k, false])
  ) as Record<string, boolean>;

  const isVisible = (key: string) => !hidden.includes(key);

  return { visible, isVisible, toggle };
}

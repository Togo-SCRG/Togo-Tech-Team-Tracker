"use client";

import { useEffect, useState } from "react";
import type { ViewMode } from "@/components/ui/ViewToggle";

/**
 * Table/card layout preference, remembered per list. Defaults to `table`:
 * the denser layout shows more rows at once, which is what these pages are
 * usually open for.
 *
 * The stored value is read in an effect rather than during render — reading
 * localStorage while rendering would produce different markup on the server
 * and the client, which React reports as a hydration mismatch.
 */
export function useViewMode(storageKey: string, fallback: ViewMode = "table") {
  const [view, setView] = useState<ViewMode>(fallback);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored === "table" || stored === "card") setView(stored);
  }, [storageKey]);

  function update(next: ViewMode) {
    setView(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // Private-browsing modes can reject writes; the in-memory state is
      // still correct for this session, so there's nothing to recover from.
    }
  }

  function toggle() {
    update(view === "table" ? "card" : "table");
  }

  return { view, setView: update, toggleView: toggle };
}

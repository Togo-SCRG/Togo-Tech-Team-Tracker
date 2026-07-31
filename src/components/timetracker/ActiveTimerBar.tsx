"use client";

import { Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useActiveTimer } from "@/lib/useActiveTimer";
import { formatElapsed } from "@/lib/utils";

// Mounted globally (in the Topbar) so a timer started from any project
// page stays visible and stoppable no matter where you navigate to.
export function ActiveTimerBar() {
  const { active, elapsedSeconds, saving, stop } = useActiveTimer();

  if (!active) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-togo-blue bg-togo-blue-muted px-3 py-1.5">
      <span className="text-xs text-togo-blue font-medium truncate max-w-[140px]" title={active.project}>
        {active.project}
      </span>
      <span className="text-sm font-bold text-togo-blue tabular-nums">{formatElapsed(elapsedSeconds)}</span>
      <Button size="sm" onClick={() => stop()} disabled={saving} className="bg-[#EF4444] hover:bg-[#DC2626]">
        <Square size={14} /> {saving ? "Saving..." : "Stop"}
      </Button>
    </div>
  );
}

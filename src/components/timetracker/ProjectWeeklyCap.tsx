"use client";

import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useToast } from "@/components/ui/Toast";
import { cn, formatMinutes } from "@/lib/utils";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { can } from "@/lib/capabilities";

/**
 * The "This Week" card in the project metrics row. Renders one card so it can
 * sit in the same grid as Total Logged and Blockers.
 *
 * The cap is edited in a modal rather than inline, matching the Blockers card:
 * the form replaced the card's own contents, so the row's three cards changed
 * height and the number you were budgeting against disappeared while you typed.
 */
export function ProjectWeeklyCap({
  projectName,
  weekMinutes,
  initialWeeklyHourCap = null,
}: {
  projectName: string;
  weekMinutes: number;
  initialWeeklyHourCap?: number | null;
}) {
  const toast = useToast();
  const { currentUser } = useCurrentUser();
  const canManage = can(currentUser?.capabilities, "project.hourcap.edit");
  // Seeded from the server render — this card used to blank out behind a
  // skeleton on every visit while re-fetching a value the page already had.
  const [weeklyHourCap, setWeeklyHourCap] = useState<number | null>(initialWeeklyHourCap);
  const [open, setOpen] = useState(false);
  const [capEnabled, setCapEnabled] = useState(initialWeeklyHourCap != null);
  const [hoursInput, setHoursInput] = useState(initialWeeklyHourCap != null ? String(initialWeeklyHourCap) : "40");
  const [saving, setSaving] = useState(false);

  // Reopening starts from what's actually saved, so an abandoned edit isn't
  // still sitting in the form next time.
  useEffect(() => {
    if (!open) return;
    setCapEnabled(weeklyHourCap != null);
    setHoursInput(weeklyHourCap != null ? String(weeklyHourCap) : "40");
  }, [open, weeklyHourCap]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const value = capEnabled ? Number(hoursInput) : null;
    const res = await fetch("/api/project-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: projectName, weeklyHourCap: value }),
    });
    setSaving(false);

    if (res.ok) {
      setWeeklyHourCap(value);
      setOpen(false);
      toast.success(value == null ? "Weekly cap removed." : `Weekly cap set to ${value}h.`);
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't save the weekly cap. Please try again.");
    }
  }

  const capMinutes = weeklyHourCap ? weeklyHourCap * 60 : 0;
  // Deliberately not clamped, so going over budget shows as a real number
  // rather than being flattened to "100%".
  const rawPct = capMinutes > 0 ? Math.round((weekMinutes / capMinutes) * 100) : 0;
  const overCap = capMinutes > 0 && weekMinutes > capMinutes;
  const reached = capMinutes > 0 && weekMinutes >= capMinutes;
  const remaining = capMinutes > 0 ? Math.max(0, capMinutes - weekMinutes) : 0;
  const hoursInputInvalid = capEnabled && (!Number(hoursInput) || Number(hoursInput) <= 0);

  return (
    <>
      <div className="flex flex-col rounded-md border border-togo-border bg-togo-surface p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-xs text-togo-muted">This week</p>
          {canManage ? (
            <button
              onClick={() => setOpen(true)}
              className="rounded border border-togo-border px-1.5 py-0.5 text-[10px] font-medium text-togo-blue transition-colors hover:border-togo-blue"
            >
              {weeklyHourCap != null ? "Edit cap" : "Set cap"}
            </button>
          ) : (
            <Gauge size={13} className="shrink-0 text-togo-faint" />
          )}
        </div>

        <div className="flex flex-wrap items-baseline gap-1.5">
          <span
            className={cn(
              "tnum text-3xl font-extrabold leading-none",
              overCap ? "text-[var(--status-blocked-fg)]" : "text-togo-blue"
            )}
          >
            {formatMinutes(weekMinutes)}
          </span>
          {weeklyHourCap != null && (
            <span className="tnum text-sm font-semibold text-togo-faint">/ {weeklyHourCap}h cap</span>
          )}
        </div>

        {weeklyHourCap != null ? (
          <div className="mt-3 space-y-1.5">
            <ProgressBar
              value={rawPct}
              overCap={overCap}
              label={`${rawPct}% of the ${weeklyHourCap} hour weekly cap`}
              className="h-1.5"
            />
            <div className="flex items-center justify-between gap-2 text-[10px]">
              <span className="tnum text-togo-muted">{rawPct}% used</span>
              {overCap ? (
                <span className="tnum font-medium text-[var(--status-blocked-fg)]">
                  {formatMinutes(weekMinutes - capMinutes)} over
                </span>
              ) : reached ? (
                <span className="font-medium text-[var(--status-hold-fg)]">Cap reached</span>
              ) : (
                <span className="tnum text-togo-faint">{formatMinutes(remaining)} left</span>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-auto pt-2 text-[10px] text-togo-muted">
            {canManage ? "Set a cap to track pace against a budget" : "No weekly cap set"}
          </p>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Weekly hour cap">
        <form onSubmit={handleSave} className="space-y-4">
          <p className="text-xs text-togo-muted">
            A budget for {projectName}. The card shows this week&apos;s tracked time against it, and turns red once
            it&apos;s exceeded.
          </p>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-togo-white">
            <Checkbox
              checked={capEnabled}
              onChange={() => setCapEnabled((v) => !v)}
              label="Track a weekly hour cap"
            />
            Track a weekly hour cap
          </label>

          {capEnabled && (
            <div className="w-32">
              <Label htmlFor="weekly-cap-hours" required>
                Hours / week
              </Label>
              <Input
                id="weekly-cap-hours"
                type="number"
                min={1}
                value={hoursInput}
                onChange={(e) => setHoursInput(e.target.value)}
                aria-invalid={hoursInputInvalid}
                autoFocus
              />
              {hoursInputInvalid && (
                <p className="mt-1 text-[11px] text-[var(--status-blocked-fg)]">Enter a number above zero.</p>
              )}
            </div>
          )}

          {!capEnabled && weeklyHourCap != null && (
            <p className="rounded-md border border-[var(--status-hold-border)] bg-[var(--status-hold-bg)] px-3 py-2 text-xs text-[var(--status-hold-fg)]">
              Saving now removes the {weeklyHourCap}h cap. Tracked time is kept — only the budget goes.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || hoursInputInvalid}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

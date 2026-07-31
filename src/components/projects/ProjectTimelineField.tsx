"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock, CalendarDays, Check, Pencil, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { DatePicker, formatPickedDate } from "@/components/ui/DatePicker";
import { useToast } from "@/components/ui/Toast";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { can } from "@/lib/capabilities";
import { daysOverdue, isTimelineOverdue } from "@/lib/timeline";

/**
 * The project's target timeline, edited in place from the project header.
 *
 * Free text *and* a calendar: you can type "End of Q3" or "2 sprints", or pick
 * a concrete day. The picker just writes a formatted date into the same text
 * field, so there's one value to store and no mode to switch between.
 */
export function ProjectTimelineField({
  projectName,
  initialTimeline,
  status,
  isProjectMember,
}: {
  projectName: string;
  initialTimeline: string;
  status: string;
  /** On the project — assigned, or has logged an update or time against it. */
  isProjectMember: boolean;
}) {
  const toast = useToast();
  const { currentUser } = useCurrentUser();
  const [timeline, setTimeline] = useState(initialTimeline);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialTimeline);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Mirrors the trigger: the capability, plus the row-scoped rule that a tier
  // without "manage every project" only gets the ones they're on.
  const caps = currentUser?.capabilities;
  const canEdit =
    can(caps, "project.timeline.edit") && (can(caps, "project.manage.all") || isProjectMember);
  const overdue = isTimelineOverdue(timeline, status);
  const lateBy = overdue ? daysOverdue(timeline) : 0;

  // Close only the calendar on an outside click — clicking away from the whole
  // editor shouldn't silently discard a half-typed value.
  useEffect(() => {
    if (!pickerOpen) return;
    function onOutside(e: MouseEvent) {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [pickerOpen]);

  async function save(next = draft) {
    const value = next.trim();
    setSaving(true);
    const res = await fetch("/api/project-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: projectName, timeline: value }),
    });
    setSaving(false);

    if (res.ok) {
      setTimeline(value);
      setEditing(false);
      setPickerOpen(false);
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't save the timeline. Please try again.");
    }
  }

  function cancel() {
    setDraft(timeline);
    setEditing(false);
    setPickerOpen(false);
  }

  if (editing) {
    return (
      <div ref={editorRef} className="relative flex items-center gap-1.5">
        <CalendarClock size={13} className="shrink-0 text-togo-faint" />
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") cancel();
          }}
          placeholder="e.g. End of Q3, or pick a date"
          autoFocus
          className="h-7 w-56 py-1 text-xs"
        />

        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          aria-expanded={pickerOpen}
          title="Pick a date"
          aria-label="Pick a date"
          className="rounded p-1 text-togo-faint transition-colors hover:text-togo-blue"
        >
          <CalendarDays size={14} />
        </button>

        <button
          onClick={() => save()}
          disabled={saving}
          title="Save timeline"
          aria-label="Save timeline"
          className="rounded p-1 text-togo-blue transition-colors hover:bg-togo-blue/10 disabled:opacity-50"
        >
          <Check size={14} />
        </button>
        <button
          onClick={cancel}
          disabled={saving}
          title="Cancel"
          aria-label="Cancel"
          className="rounded p-1 text-togo-faint transition-colors hover:text-togo-muted"
        >
          <X size={14} />
        </button>

        {pickerOpen && (
          <div className="animate-fade-in absolute left-0 top-9 z-40">
            <DatePicker
              onSelect={(date) => {
                // Writes into the same text field rather than saving straight
                // away, so a picked date can still be edited by hand.
                setDraft(formatPickedDate(date));
                setPickerOpen(false);
              }}
              onCancel={() => setPickerOpen(false)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <CalendarClock size={13} className="shrink-0 text-togo-faint" />
      <span className="text-[10px] uppercase tracking-wider text-togo-faint">Timeline</span>
      <span
        className={
          overdue
            ? "text-sm font-bold text-[var(--status-blocked-fg)]"
            : timeline
            ? "text-sm font-bold text-togo-white"
            : "text-sm italic text-togo-faint"
        }
      >
        {timeline || "Not set"}
      </span>
      {overdue && (
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--status-blocked-border)] bg-[var(--status-blocked-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--status-blocked-fg)]">
          Overdue by {lateBy} {lateBy === 1 ? "day" : "days"}
        </span>
      )}
      {canEdit && (
        <button
          onClick={() => {
            setDraft(timeline);
            setEditing(true);
          }}
          title="Edit timeline"
          aria-label="Edit timeline"
          className="rounded p-1 text-togo-faint transition-colors hover:text-togo-blue"
        >
          <Pencil size={12} />
        </button>
      )}
    </div>
  );
}

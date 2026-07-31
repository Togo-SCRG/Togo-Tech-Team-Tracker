"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { cn, STATUS_OPTIONS, statusHex } from "@/lib/utils";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { can } from "@/lib/capabilities";

/**
 * The project's overall status, in its header.
 *
 * A picker rather than click-to-cycle: cycling meant clicking four times to get
 * from "Not Started" to "Blocked", with each click writing to the database, and
 * nothing on screen said which order the statuses came in.
 */
export function ProjectStatusBadge({
  projectName,
  initialStatus,
  isProjectMember,
}: {
  projectName: string;
  initialStatus: string;
  /** On the project — assigned, or has logged an update or time against it. */
  isProjectMember: boolean;
}) {
  const toast = useToast();
  const { currentUser } = useCurrentUser();
  const [status, setStatus] = useState(initialStatus);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // People on the project, plus admins and the super admin — whoever is doing
  // the work says where it stands, but someone uninvolved shouldn't be able to
  // reclassify it. Mirrors the database rule (migration 028); showing the picker
  // to anyone else would just produce a permission error on save.
  // Two questions, matching the trigger: may this tier change a status at
  // all, and is this a project they're allowed to touch?
  const caps = currentUser?.capabilities;
  const canEdit =
    can(caps, "project.status.edit") && (can(caps, "project.manage.all") || isProjectMember);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function choose(next: string) {
    setOpen(false);
    if (next === status) return;

    const prev = status;
    setStatus(next); // optimistic
    setSaving(true);
    const res = await fetch("/api/project-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: projectName, status: next }),
    });
    setSaving(false);

    if (!res.ok) {
      // Reverting silently made a failed click look like it never registered.
      setStatus(prev);
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't change the project status. Please try again.");
    }
  }

  if (!canEdit) return <StatusBadge status={status} />;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Change the project status"
        className={cn(
          "flex items-center gap-1 rounded-md border border-transparent px-1 py-0.5 transition-colors hover:border-togo-border-strong",
          open && "border-togo-border-strong",
          saving && "opacity-60"
        )}
      >
        <StatusBadge status={status} />
        <ChevronDown size={13} className="shrink-0 text-togo-faint" />
      </button>

      {open && (
        <div
          role="listbox"
          className="animate-fade-in absolute right-0 z-40 mt-1.5 w-44 overflow-hidden rounded-md border border-togo-border bg-togo-surface shadow-[var(--shadow-modal)]"
        >
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === status}
              onClick={() => choose(option)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--togo-hover)]",
                option === status ? "text-togo-white" : "text-togo-muted"
              )}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: statusHex(option) }}
                aria-hidden
              />
              <span className="flex-1">{option}</span>
              {option === status && <Check size={12} className="shrink-0 text-togo-blue" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

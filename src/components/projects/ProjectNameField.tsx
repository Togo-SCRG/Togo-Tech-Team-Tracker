"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { can } from "@/lib/capabilities";

/**
 * The project's name, edited in place from the project header.
 *
 * The name is also the project's identity — it's the join key in every table
 * and the `[name]` segment of this page's URL — so saving navigates to the new
 * address rather than staying put on a URL that no longer resolves.
 */
export function ProjectNameField({
  projectName,
  isProjectMember,
}: {
  projectName: string;
  /** On the project — assigned, or has logged an update or time against it. */
  isProjectMember: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { currentUser } = useCurrentUser();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);
  const [saving, setSaving] = useState(false);

  // Same shape as the timeline field: the capability, plus the row-scoped rule
  // that a tier without "manage every project" only gets the ones they're on.
  const caps = currentUser?.capabilities;
  const canEdit =
    can(caps, "project.name.edit") && (can(caps, "project.manage.all") || isProjectMember);

  async function save() {
    const value = draft.trim();
    if (!value) {
      toast.error("A project needs a name.");
      return;
    }
    if (value === projectName) {
      setEditing(false);
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newName: value }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setSaving(false);
      toast.error(data.error || "Couldn't rename the project. Please try again.");
      return;
    }

    // `replace`, not `push`: the old name 404s now, so leaving it in history
    // would make Back a dead end. Stays in the saving state until the new route
    // has rendered — the row this page reads no longer matches the old name.
    setEditing(false);
    toast.success(`Renamed to “${data.project}”.`);
    router.replace(`/projects/${encodeURIComponent(data.project as string)}`);
    router.refresh();
  }

  function cancel() {
    setDraft(projectName);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-1 items-center gap-1.5">
        <span className="text-xl font-extrabold text-togo-muted">Project: </span>
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
          maxLength={120}
          placeholder="Project name"
          autoFocus
          disabled={saving}
          className="h-8 w-64 py-1 text-sm font-bold"
        />
        <button
          onClick={save}
          disabled={saving}
          title="Save name"
          aria-label="Save name"
          className="rounded p-1 text-togo-blue transition-colors hover:bg-togo-blue/10 disabled:opacity-50"
        >
          <Check size={14} />
        </button>
        <button
          onClick={cancel}
          disabled={saving}
          title="Cancel"
          aria-label="Cancel"
          className="rounded p-1 text-togo-faint transition-colors hover:text-togo-muted disabled:opacity-50"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <h1 className="text-xl font-extrabold text-togo-white">
        <span className="text-togo-muted">Project: </span>
        {projectName}
      </h1>
      {canEdit && (
        <button
          onClick={() => {
            setDraft(projectName);
            setEditing(true);
          }}
          title="Rename project"
          aria-label="Rename project"
          className="rounded p-1 text-togo-faint transition-colors hover:text-togo-blue"
        >
          <Pencil size={12} />
        </button>
      )}
    </div>
  );
}

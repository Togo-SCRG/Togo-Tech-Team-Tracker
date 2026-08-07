"use client";

import { useState } from "react";
import { NotebookPen, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BulletTextarea } from "@/components/ui/BulletTextarea";
import { useToast } from "@/components/ui/Toast";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { can } from "@/lib/capabilities";
import { Section } from "@/components/ui/Section";

/**
 * Free-form notes about a project.
 *
 * Distinct from the overview, which describes what the project *is*, and from
 * the PRD, which says what it must do. This is the running commentary — how the
 * client likes to be contacted, which environment is fragile, what was decided
 * on a call. It kept ending up in the overview, where it buried the description
 * everyone opens the page for.
 *
 * Bulleted and resizable, like the update form: notes accumulate as a list of
 * unrelated facts rather than a paragraph.
 */
export function ProjectSideNotes({
  projectName,
  initialNote,
  isProjectMember,
}: {
  projectName: string;
  initialNote: string;
  /** On this project — assigned, or has logged an update or time against it. */
  isProjectMember: boolean;
}) {
  const toast = useToast();
  const { currentUser, loaded } = useCurrentUser();
  const [note, setNote] = useState(initialNote);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  // Same rule as the overview and PRD (migration 036/039): the capability, plus
  // either "manage every project" or being on this one.
  const caps = currentUser?.capabilities;
  const canEdit =
    can(caps, "project.docs.edit") && (can(caps, "project.manage.all") || isProjectMember);

  async function save() {
    const value = draft.trim();
    setSaving(true);
    const res = await fetch("/api/project-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: projectName, sideNote: value }),
    });
    setSaving(false);

    if (res.ok) {
      const had = !!note;
      setNote(value);
      setEditing(false);
      toast.success(value ? `Notes ${had ? "updated" : "added"}.` : "Notes cleared.");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't save the notes. Please try again.");
    }
  }

  // Nothing written and nothing this viewer could add — stay out of the way,
  // same as the docs card.
  if (!note && (!loaded || !canEdit)) return null;

  return (
    <Section
      title="Side notes"
      icon={NotebookPen}
      action={
        canEdit && !editing ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setDraft(note);
              setEditing(true);
            }}
          >
            {note ? <Pencil size={13} /> : <Plus size={13} />}
            {note ? "Edit notes" : "Add notes"}
          </Button>
        ) : undefined
      }
      bodyClassName="p-4"
    >
      {editing ? (
        <div className="space-y-3">
          <BulletTextarea
            rows={4}
            value={draft}
            onChange={setDraft}
            placeholder="Anything worth remembering about this project — decisions, quirks, who to ask"
          />
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="text-xs text-togo-faint transition-colors hover:text-togo-muted disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : note ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-togo-white">{note}</p>
      ) : (
        <p className="text-sm italic text-togo-faint">
          No notes yet — decisions, quirks and context that don&apos;t belong in the overview go here.
        </p>
      )}
    </Section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select, Label } from "@/components/ui/Input";
import { DateField } from "@/components/ui/DateField";
import { Combobox } from "@/components/ui/Combobox";
import { BulletTextarea } from "@/components/ui/BulletTextarea";
import { WorkTypeToggle } from "@/components/ui/WorkTypeToggle";
import { normaliseWorkType, type WorkType } from "@/lib/workType";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { STATUS_OPTIONS, toDateInputValue } from "@/lib/utils";
import type { CurrentUser, DailyUpdateItem, MemberItem } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  currentUser: CurrentUser;
  members: MemberItem[];
  editingUpdate: DailyUpdateItem | null;
  defaultDate: string;
  existingProjects?: string[];
  /** Names already used for non-project work, for the Task suggestions. */
  existingTasks?: string[];
  /**
   * Show the member picker — set by the "Log member update" button, not
   * inferred from the tier. Logging for someone else is now its own permission
   * (migration 034), and the caller has already checked it.
   */
  allowMemberPick?: boolean;
}

export function UpdateModal({
  open,
  onClose,
  onSaved,
  currentUser,
  members,
  editingUpdate,
  defaultDate,
  existingProjects = [],
  existingTasks = [],
  allowMemberPick = false,
}: Props) {
  const toast = useToast();
  const [userId, setUserId] = useState(currentUser.id);
  const [date, setDate] = useState(defaultDate);
  const [project, setProject] = useState("");
  const [workType, setWorkType] = useState<WorkType>("project");
  const [update, setUpdate] = useState("");
  const [whatsLeft, setWhatsLeft] = useState("");
  const [blockers, setBlockers] = useState("");
  const [status, setStatus] = useState("In Progress");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState(false);
  // Which project we've already pulled a status for, so re-renders don't refetch
  // and, more importantly, so opening an existing update keeps the status it was
  // saved with instead of being overwritten on mount.
  const syncedProject = useRef<string | null>(null);

  useEffect(() => {
    if (editingUpdate) {
      setUserId(editingUpdate.userId);
      setDate(toDateInputValue(editingUpdate.date));
      setProject(editingUpdate.project);
      setWorkType(normaliseWorkType(editingUpdate.workType));
      setUpdate(editingUpdate.update);
      setWhatsLeft(editingUpdate.whatsLeft || "");
      setBlockers(editingUpdate.blockers || "");
      setStatus(editingUpdate.status);
    } else {
      setUserId(currentUser.id);
      setDate(defaultDate);
      setProject("");
      setWorkType("project");
      setUpdate("");
      setWhatsLeft("");
      setBlockers("");
      setStatus("In Progress");
    }
    setError(null);
    syncedProject.current = editingUpdate?.project ?? null;
  }, [editingUpdate, open, currentUser.id, defaultDate]);

  // Picking a project pulls that project's current status into the field, so it
  // opens showing where the project actually stands rather than a default.
  useEffect(() => {
    const name = project.trim();
    if (!open || !name || syncedProject.current === name) return;
    syncedProject.current = name;

    let cancelled = false;
    setSyncingStatus(true);
    fetch(`/api/project-settings?project=${encodeURIComponent(name)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.settings?.status) return;
        setStatus(data.settings.status);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSyncingStatus(false);
      });

    return () => {
      cancelled = true;
    };
  }, [project, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = { userId, date, project, workType, update, whatsLeft, blockers, status };

    try {
      const res = editingUpdate
        ? await fetch(`/api/updates/${editingUpdate.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/updates`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save update.");
        setSaving(false);
        return;
      }

      toast.success(editingUpdate ? "Update saved." : "Update logged.");
      onSaved();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingUpdate) return;
    setSaving(true);
    const res = await fetch(`/api/updates/${editingUpdate.id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteConfirmOpen(false);
      toast.success("Update deleted.");
      onSaved();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to delete update.");
      setDeleteConfirmOpen(false);
    }
    setSaving(false);
  }

  const canPickMember = allowMemberPick && !editingUpdate;
  // A row with no project and no text is noise in the tracker, so the save
  // button stays disabled until there's something worth recording.
  const canSave = project.trim() !== "" && update.trim() !== "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingUpdate ? "Edit Update" : canPickMember ? "Log Member Update" : "Log Update"}
      className="max-w-2xl"
    >
      {/* Ctrl/Cmd+Enter submits — this form gets filled in every day, and
          reaching for the mouse on every save adds up. */}
      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSave) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
        className="space-y-4"
      >
        {canPickMember && (
          <div>
            <Label htmlFor="update-member">Member</Label>
            <Select id="update-member" value={userId} onChange={(e) => setUserId(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="update-date" required>
              Date
            </Label>
            <DateField
              id="update-date"
              value={date}
              max={toDateInputValue(new Date())}
              onChange={setDate}
              required
            />
          </div>
          {/* Hidden for a task: this field moves a *project's* status, and a
              task has none. The server ignores it on a task row rather than
              trusting the form, so leaving it visible would be a control that
              silently does nothing. */}
          {workType === "project" && (
            <div>
              {/* "Project status", not "Status": this field moves the whole
                  project, not just this one row. The column in the database is
                  still `status` — only the label changed. */}
              <Label htmlFor="update-status" hint={syncingStatus ? "Loading…" : undefined}>
                Project status
              </Label>
              <Select id="update-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <Label
              required
              className="mb-0"
              hint={
                workType === "task"
                  ? "Pick an existing task or type a new name"
                  : "Pick an existing project or type a new name"
              }
            >
              {workType === "task" ? "Task" : "Project"}
            </Label>
            {/* Work that isn't a project — meetings, admin, support — still gets
                logged, it just doesn't create or move a project. */}
            <WorkTypeToggle
              value={workType}
              onChange={(next) => {
                setWorkType(next);
                // The two name lists are separate, so a half-typed project name
                // is meaningless as a task and vice versa.
                setProject("");
              }}
            />
          </div>
          <Combobox
            value={project}
            onChange={setProject}
            options={workType === "task" ? existingTasks : existingProjects}
            placeholder={workType === "task" ? "e.g. Meetings" : "e.g. QuikSkope V2"}
            required
          />
        </div>

        <div>
          <Label required hint="Press Enter for a new bullet">
            Update
          </Label>
          <BulletTextarea rows={3} value={update} onChange={setUpdate} placeholder="Describe the work done" />
        </div>

        <div>
          <Label>What&apos;s Left To Do</Label>
          <BulletTextarea rows={2} value={whatsLeft} onChange={setWhatsLeft} placeholder="Anything still outstanding" />
        </div>

        <div>
          {/* Timeline lives on the project now, not on each update — one
              deadline per project rather than a different answer per task. */}
          <Label hint="Sets the Blocked flag">Concerns / Blockers</Label>
          <BulletTextarea
            rows={2}
            value={blockers}
            onChange={setBlockers}
            placeholder="What's in the way, if anything"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-[var(--status-blocked-border)] bg-[var(--status-blocked-bg)] px-3 py-2"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-[var(--status-blocked-fg)]" />
            <p className="text-sm text-[var(--status-blocked-fg)]">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <div>
            {editingUpdate && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={saving}
                className="border-[var(--status-blocked-fg)] text-[var(--status-blocked-fg)] hover:bg-[var(--status-blocked-bg)]"
              >
                <Trash2 size={14} /> Delete
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !canSave}
              title={canSave ? "Save (Ctrl+Enter)" : "Add a project and an update first"}
            >
              {saving ? "Saving..." : editingUpdate ? "Save changes" : "Log update"}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Update"
        description={`Are you sure you want to delete this${
          editingUpdate ? ` "${editingUpdate.project}"` : ""
        } update? This can't be undone.`}
        confirmLabel="Delete"
        danger
        loading={saving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </Modal>
  );
}

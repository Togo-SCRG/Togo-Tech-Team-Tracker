"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, Pencil, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { can } from "@/lib/capabilities";
import { cn, formatDateShort, toDateInputValue } from "@/lib/utils";

export interface BlockerItem {
  id: string;
  userName: string;
  avatarUrl: string | null;
  blockers: string;
  date: string;
}

/**
 * The "Blockers & risk" card in the project metrics row.
 *
 * The card itself is just the count, matching the two stat cards beside it —
 * it used to inline the whole list plus an add form, which made one card in a
 * three-card row several times taller than its neighbours and pushed the rest
 * of the page down. Reading and editing happen in a modal instead.
 */
export function ProjectBlockers({
  projectName,
  blockers: initialBlockers,
}: {
  projectName: string;
  blockers: BlockerItem[];
}) {
  const toast = useToast();
  const { currentUser } = useCurrentUser();
  const [blockers, setBlockers] = useState(initialBlockers);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleResolve(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/updates/${id}/blocker`, { method: "DELETE" });
    if (res.ok) {
      setBlockers((prev) => prev.filter((b) => b.id !== id));
      toast.success("Blocker resolved.");
    } else {
      toast.error("Failed to resolve blocker. Please try again.");
    }
    setBusyId(null);
  }

  function startEdit(b: BlockerItem) {
    setEditingId(b.id);
    setEditText(b.blockers);
  }

  async function handleSaveEdit(id: string) {
    const text = editText.trim();
    if (!text) return;
    setSaving(true);
    const res = await fetch(`/api/updates/${id}/blocker`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockers: text }),
    });
    if (res.ok) {
      setBlockers((prev) => prev.map((b) => (b.id === id ? { ...b, blockers: text } : b)));
      setEditingId(null);
      toast.success("Blocker updated.");
    } else {
      toast.error("Failed to update blocker. Please try again.");
    }
    setSaving(false);
  }

  async function handleAdd() {
    const text = newText.trim();
    if (!text) return;
    setSaving(true);
    const res = await fetch("/api/updates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: projectName,
        date: toDateInputValue(new Date()),
        blockers: text,
        status: "Blocked",
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const u = data.update;
      setBlockers((prev) => [
        {
          id: u.id,
          userName: u.user?.name || "You",
          avatarUrl: u.user?.avatarUrl ?? null,
          blockers: u.blockers,
          date: u.date,
        },
        ...prev,
      ]);
      setNewText("");
      setAdding(false);
      toast.success("Blocker added.");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to add blocker. Please try again.");
    }
    setSaving(false);
  }

  /** `withForm` opens straight into the add form — that's the Add blocker
   *  button on the card, which shouldn't need a second click inside. */
  function openModal(withForm: boolean) {
    setAdding(withForm);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setAdding(false);
    setNewText("");
    setEditingId(null);
  }

  const count = blockers.length;
  const clear = count === 0;
  const canEdit = can(currentUser?.capabilities, "blocker.manage");

  return (
    <>
      {/* A div, not a button: "Add blocker" is a control of its own and nesting
          buttons is invalid. The card-wide click target is an overlay behind
          the content instead, with the content non-interactive so clicks fall
          through to it — everything except the Add button opens the list. */}
      <div
        className={cn(
          "relative flex flex-col rounded-md border bg-togo-surface p-4 transition-colors",
          clear
            ? "border-togo-border hover:border-togo-blue"
            : "border-[var(--status-blocked-border)] hover:border-[var(--status-blocked-fg)]"
        )}
      >
        <button
          type="button"
          onClick={() => openModal(false)}
          aria-label={clear ? "View blockers" : `View ${count} ${count === 1 ? "blocker" : "blockers"}`}
          title="View blockers"
          className="absolute inset-0 rounded-md"
        />

        <div className="pointer-events-none relative mb-1 flex items-center justify-between gap-2">
          <p className="text-xs text-togo-muted">Blockers &amp; risk</p>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => openModal(true)}
                className="pointer-events-auto rounded border border-togo-border px-1.5 py-0.5 text-[10px] font-medium text-togo-blue transition-colors hover:border-togo-blue"
              >
                Add blocker
              </button>
            )}
            <AlertTriangle
              size={13}
              className={cn("shrink-0", clear ? "text-togo-faint" : "text-[var(--status-blocked-fg)]")}
            />
          </div>
        </div>

        {/* Just the number, like "Total logged" and "This week" beside it. */}
        <div
          className={cn(
            "pointer-events-none relative tnum text-3xl font-extrabold leading-none",
            clear ? "text-togo-white" : "text-[var(--status-blocked-fg)]"
          )}
        >
          {count}
        </div>

        <p className="pointer-events-none relative mt-auto pt-2 text-[10px] text-togo-muted">
          {clear ? "None outstanding" : canEdit ? "Click to view and resolve" : "Click to view"}
        </p>
      </div>

      <Modal open={open} onClose={closeModal} title="Blockers & risk">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-togo-muted">
              {clear ? (
                "Nothing is blocked on this project."
              ) : (
                <>
                  <span className="tnum font-semibold text-[var(--status-blocked-fg)]">{count}</span> outstanding on{" "}
                  <span className="text-togo-white">{projectName}</span>
                </>
              )}
            </p>
            {canEdit && !adding && (
              <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
                <Plus size={14} /> Add blocker
              </Button>
            )}
          </div>

          {adding && (
            <div className="space-y-2 rounded-md border border-togo-border bg-togo-surface-2/40 p-3">
              <Textarea
                rows={3}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="What's blocking progress?"
                className="text-xs"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleAdd} disabled={saving || !newText.trim()}>
                  {saving ? "Saving..." : "Save"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setNewText("");
                  }}
                  disabled={saving}
                  className="text-xs text-togo-faint hover:text-togo-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {clear ? (
            !adding && (
              <EmptyState
                icon={Check}
                title="No blockers"
                description="Anything raised here shows on the dashboard and marks the project blocked until it's resolved."
                className="border-0 bg-transparent py-8"
              />
            )
          ) : (
            <ul className="max-h-[45vh] space-y-2 overflow-y-auto">
              {blockers.map((b) => (
                <li key={b.id} className="rounded border border-togo-border bg-togo-surface-2/40 p-3">
                  {editingId === b.id ? (
                    <div className="space-y-2">
                      <Textarea
                        rows={3}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="text-xs"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(b.id)} disabled={saving || !editText.trim()}>
                          {saving ? "Saving..." : "Save"}
                        </Button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          disabled={saving}
                          className="text-xs text-togo-faint hover:text-togo-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-line text-xs leading-snug text-togo-white">{b.blockers}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="truncate text-[10px] text-togo-faint">
                          {b.userName} · {formatDateShort(b.date)}
                        </span>
                        {canEdit && (
                          <div className="ml-auto flex shrink-0 items-center gap-2">
                            <button
                            type="button"
                              onClick={() => startEdit(b)}
                              title="Edit blocker"
                              aria-label="Edit blocker"
                              className="text-togo-faint transition-colors hover:text-togo-blue"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResolve(b.id)}
                              disabled={busyId === b.id}
                              title="Mark as resolved"
                              aria-label="Mark as resolved"
                              className="text-togo-faint transition-colors hover:text-[var(--status-completed-fg)] disabled:opacity-50"
                            >
                              {busyId === b.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </>
  );
}

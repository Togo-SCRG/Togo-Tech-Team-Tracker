"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Avatar } from "@/components/ui/Avatar";
import { Checkbox } from "@/components/ui/Checkbox";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type { MemberItem } from "@/types";

/**
 * Adds people to a project from the project's own Team panel.
 *
 * The reverse direction (pick a project for one person) already exists as
 * MemberProjectModal; this exists because doing it from the project is the
 * natural move when you're looking at an under-staffed project.
 */
export function AddProjectMemberModal({
  open,
  onClose,
  onAdded,
  projectName,
  existingUserIds,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  projectName: string;
  /** Already on the project — excluded so they can't be added twice. */
  existingUserIds: string[];
}) {
  const toast = useToast();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setSelected([]);
    setRole("");
    setError(null);
    setLoading(true);
    // all=1 so client stakeholders are selectable too — they get assigned to
    // projects even though they're hidden from the engineer lists.
    fetch("/api/members?all=1")
      .then((res) => res.json())
      .then((data) => setMembers(data.members || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [open]);

  const available = useMemo(() => {
    const taken = new Set(existingUserIds);
    const q = search.trim().toLowerCase();
    return members
      .filter((m) => !taken.has(m.id))
      .filter((m) => !q || `${m.name} ${m.role}`.toLowerCase().includes(q));
  }, [members, existingUserIds, search]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);

    // One request per person: the endpoint takes a single assignment, and doing
    // them separately means a partial success still reports which ones landed
    // rather than failing the whole batch silently.
    const results = await Promise.all(
      selected.map(async (userId) => {
        const res = await fetch("/api/member-projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            project: projectName,
            status: "Not Started",
            role: role.trim(),
            partnerIds: [],
          }),
        });
        if (res.ok) return { ok: true as const };
        const data = await res.json().catch(() => ({}));
        return { ok: false as const, error: data.error as string | undefined };
      })
    );

    const added = results.filter((r) => r.ok).length;
    const failed = results.length - added;
    setSaving(false);

    if (added > 0) {
      toast.success(
        added === 1 ? "1 person added to the project." : `${added} people added to the project.`
      );
      onAdded();
    }
    if (failed > 0) {
      setError(
        results.find((r) => !r.ok)?.error ||
          `${failed} of ${results.length} couldn't be added. Please try again.`
      );
      return;
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add to project" className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-togo-muted">
          Who should be on <span className="font-semibold text-togo-white">{projectName}</span>? They&apos;ll get a
          notification.
        </p>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or role..."
          containerClassName="w-full"
        />

        <div className="max-h-64 overflow-y-auto rounded-md border border-togo-border">
          {loading ? (
            <div className="space-y-1 p-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-11 animate-pulse rounded bg-togo-surface-2" />
              ))}
            </div>
          ) : available.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-togo-muted">
              {search.trim()
                ? `Nobody matches “${search.trim()}”.`
                : "Everyone is already on this project."}
            </p>
          ) : (
            <ul className="divide-y divide-togo-border">
              {available.map((m) => {
                const checked = selected.includes(m.id);
                return (
                  <li key={m.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors",
                        checked ? "bg-togo-blue/10" : "hover:bg-[var(--togo-hover)]"
                      )}
                    >
                      <Checkbox checked={checked} onChange={() => toggle(m.id)} label={`Select ${m.name}`} />
                      <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" className="shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-togo-white">{m.name}</div>
                        <div className="truncate text-[11px] text-togo-faint">{m.role}</div>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <Label htmlFor="add-member-project-role" hint="Optional — applied to everyone selected">
            Role on this project
          </Label>
          <Input
            id="add-member-project-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Dev Lead"
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

        <div className="flex items-center justify-end gap-3 pt-1">
          {selected.length > 0 && (
            <span className="tnum mr-auto text-xs text-togo-muted">
              {selected.length} selected
            </span>
          )}
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || selected.length === 0}>
            <UserPlus size={14} />
            {saving ? "Adding..." : "Add to project"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

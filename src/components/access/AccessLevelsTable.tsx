"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Lock, Trash2, Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { TierBadge } from "@/components/ui/TierBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { ACCESS_LEVEL_LABELS, ACCESS_LEVEL_ORDER } from "@/lib/accessLevels";
import { formatDateShort } from "@/lib/utils";
import { usePagination } from "@/lib/usePagination";
import { TEN_ROWS_PY3 } from "@/lib/tableHeights";
import type { AccessLevel } from "@/types";
import type { AccessMember } from "@/app/(app)/access/page";

// Only the super admin reaches these controls, and they may grant any tier.
// Least to most privileged, so the dropdown reads bottom-up like a ladder.
const LEVELS: AccessLevel[] = [...ACCESS_LEVEL_ORDER].reverse();

export function AccessLevelsTable({
  initialMembers,
  currentUserId,
  canEdit,
  pendingCount = 0,
}: {
  initialMembers: AccessMember[];
  currentUserId: string;
  /** Only the super admin can change a tier; everyone else sees this read-only. */
  canEdit: boolean;
  pendingCount?: number;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccessMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const toast = useToast();

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    paged: pagedMembers,
  } = usePagination(members);

  async function changeTier(id: string, accessLevel: AccessLevel) {
    const prev = members;
    // Optimistic update.
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, accessLevel } : m)));
    setSavingId(id);
    try {
      const res = await fetch(`/api/members/${id}/access-level`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessLevel }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Failed to update access level." }));
        throw new Error(error);
      }
      toast.success("Access level updated.");
    } catch (e) {
      setMembers(prev); // rollback
      toast.error(e instanceof Error ? e.message : "Failed to update access level.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/members/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(
        deleteTarget.pending
          ? `${deleteTarget.name}'s invitation was cancelled.`
          : `${deleteTarget.name}'s account was deleted.`
      );
      setMembers((ms) => ms.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
      // Other views (Team, Featured Clients) read the same profiles table.
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error || "Failed to delete this account.");
    }
    setDeleting(false);
  }

  return (
    <div className="overflow-hidden rounded-md border border-togo-border bg-togo-surface">
      <div className="flex items-center gap-2 border-b border-togo-border px-4 py-3 text-sm font-medium text-togo-muted">
        <Users size={16} className="text-togo-blue" />
        Member access
        <span className="tnum rounded bg-togo-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-togo-muted">
          {members.length}
        </span>
        {pendingCount > 0 && (
          <span className="tnum rounded-full border border-[var(--status-hold-border)] bg-[var(--status-hold-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--status-hold-fg)]">
            {pendingCount} pending
          </span>
        )}
        {!canEdit && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-togo-faint">
            <Lock size={11} /> View only
          </span>
        )}
      </div>
      <div className={`divide-y divide-togo-border ${TEN_ROWS_PY3}`}>
        {pagedMembers.map((m) => {
          const isSelf = m.id === currentUserId;
          return (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--togo-hover)]">
              {/* A pending invitation is dimmed so the list reads as "not here
                  yet" at a glance, without hiding them. */}
              <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" className={m.pending ? "opacity-50" : undefined} />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className={`truncate text-sm ${m.pending ? "text-togo-muted" : "text-togo-white"}`}>
                    {m.name}
                  </span>
                  {isSelf && <span className="text-[10px] text-togo-faint">(you)</span>}
                  {m.pending && (
                    <span
                      title={m.invitedAt ? `Invited ${formatDateShort(m.invitedAt)} — not signed in yet` : undefined}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--status-hold-border)] bg-[var(--status-hold-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--status-hold-fg)]"
                    >
                      <Clock size={9} /> Pending
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-togo-faint">
                  {m.role}
                  {m.pending && m.invitedAt && (
                    <span className="ml-1.5">· invited {formatDateShort(m.invitedAt)}</span>
                  )}
                </div>
              </div>

              {canEdit && (
                <select
                  value={m.accessLevel}
                  disabled={savingId === m.id || isSelf}
                  onChange={(e) => changeTier(m.id, e.target.value as AccessLevel)}
                  aria-label={`Access level for ${m.name}`}
                  title={isSelf ? "You can't change your own access level" : undefined}
                  className="rounded-md border border-togo-border bg-togo-surface-2 px-2 py-1.5 text-xs text-togo-white outline-none focus:border-togo-blue disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {ACCESS_LEVEL_LABELS[l]}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex w-32 justify-end">
                <TierBadge tier={m.accessLevel} />
              </div>

              {canEdit && (
                <div className="flex w-7 justify-end">
                  {/* Deleting your own account would lock you out, and the API
                      refuses it anyway — so there's no button rather than one
                      that always errors. */}
                  {!isSelf && (
                    <button
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(m);
                      }}
                      title={m.pending ? `Cancel ${m.name}'s invitation` : `Delete ${m.name}'s account`}
                      aria-label={m.pending ? `Cancel ${m.name}'s invitation` : `Delete ${m.name}'s account`}
                      className="rounded p-1 text-[var(--status-blocked-fg)] transition-colors hover:bg-[var(--status-blocked-bg)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer inside the panel, matching the other list tables. */}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        className="border-t border-togo-border px-4 py-3"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget?.pending ? "Cancel invitation" : "Delete account"}
        description={
          deleteTarget
            ? deleteTarget.pending
              ? // A pending invite has no work attached yet, so the warning
                // shouldn't imply data is about to be lost.
                `Cancel the invitation for ${deleteTarget.name} (${
                  ACCESS_LEVEL_LABELS[deleteTarget.accessLevel]
                })? Their emailed link will stop working and they'll disappear from this list. You can invite them again later.${
                  deleteError ? ` ${deleteError}` : ""
                }`
              : `Permanently delete ${deleteTarget.name}'s account? This also removes every daily update, time entry and project assignment they have across the whole team. This can't be undone.${
                  deleteError ? ` ${deleteError}` : ""
                }`
            : ""
        }
        confirmLabel={deleteTarget?.pending ? "Cancel invitation" : "Delete account"}
        cancelLabel={deleteTarget?.pending ? "Keep invitation" : "Cancel"}
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}

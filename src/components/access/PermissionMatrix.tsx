"use client";

import { Fragment, useEffect, useState } from "react";
import { Check, Loader2, Lock, ShieldCheck } from "lucide-react";
import { TierBadge } from "@/components/ui/TierBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { CAPABILITIES, CAPABILITY_GROUPS } from "@/lib/capabilities";
import { MemberPermissions, type PermissionPerson } from "@/components/access/MemberPermissions";
import { invalidateCurrentUser } from "@/lib/useCurrentUser";
import { cn } from "@/lib/utils";
import type { AccessLevel } from "@/types";

const LEVELS: AccessLevel[] = ["super_admin", "admin", "client", "user"];

/**
 * Which tier can do what, as a grid the super admin can edit.
 *
 * Rendered only for the super admin — they're the only one who can change any
 * of it. The super_admin column is still locked within the grid: that tier
 * always holds everything, so there's no combination of clicks that locks you
 * out of this page.
 */
export function PermissionMatrix({
  people,
}: {
  /** Everyone who could have a per-person exception. */
  people: PermissionPerson[];
}) {
  const toast = useToast();
  const [matrix, setMatrix] = useState<Record<string, boolean> | null>(null);
  const [available, setAvailable] = useState(true);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/permissions")
      .then((res) => res.json())
      .then((data) => {
        setMatrix(data.matrix || {});
        setAvailable(data.available !== false);
      })
      .catch(() => setMatrix({}));
  }, []);

  async function toggle(capability: string, level: AccessLevel) {
    const key = `${capability}:${level}`;
    const next = !matrix?.[key];

    setSavingCell(key);
    setMatrix((prev) => ({ ...(prev || {}), [key]: next })); // optimistic

    const res = await fetch("/api/permissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capability, accessLevel: level, allowed: next }),
    });
    setSavingCell(null);

    if (res.ok) {
      // The signed-in user's own capabilities are cached; a super admin
      // changing their own tier's row would otherwise keep seeing the old
      // controls until a full reload.
      invalidateCurrentUser();
    } else {
      setMatrix((prev) => ({ ...(prev || {}), [key]: !next }));
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't save that permission. Please try again.");
    }
  }

  if (!matrix) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-togo-white">
            <ShieldCheck size={15} className="text-togo-blue" />
            Permissions
          </h2>
          <p className="mt-1 text-xs text-togo-muted">
            Tick a box to grant that tier the capability. Changes apply immediately.
          </p>
        </div>
      </div>

      {!available && (
        <p className="rounded-md border border-[var(--status-hold-border)] bg-[var(--status-hold-bg)] px-3 py-2 text-xs text-[var(--status-hold-fg)]">
          The permissions table doesn&apos;t exist yet — run migration 032 in Supabase. Until then the app falls back
          to its built-in rules.
        </p>
      )}

      {/* Scrolls on its own so a narrow screen doesn't scroll the whole page. */}
      <div className="overflow-x-auto rounded-md border border-togo-border bg-togo-surface">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-togo-border">
              <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider text-togo-faint">
                Capability
              </th>
              {LEVELS.map((level) => (
                <th key={level} className="w-24 px-2 py-2.5 text-center">
                  <TierBadge tier={level} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAPABILITY_GROUPS.map((group) => {
              const rows = CAPABILITIES.filter((c) => c.group === group);
              if (rows.length === 0) return null;
              return (
                // Keyed Fragment: a bare <> inside .map has no key, which React
                // warns about and which breaks row reconciliation on re-render.
                <Fragment key={group}>
                  <tr className="border-b border-togo-border bg-togo-surface-2/40">
                    <td
                      colSpan={LEVELS.length + 1}
                      className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-togo-muted"
                    >
                      {group}
                    </td>
                  </tr>
                  {rows.map((cap) => (
                    <tr
                      key={cap.key}
                      className="border-b border-togo-border transition-colors hover:bg-[var(--togo-hover)] last:border-b-0"
                    >
                      <td className="px-4 py-2.5">
                        <div className="text-xs font-medium text-togo-white">{cap.label}</div>
                        <div className="mt-0.5 text-[10px] leading-snug text-togo-faint">{cap.hint}</div>
                      </td>
                      {LEVELS.map((level) => {
                        const key = `${cap.key}:${level}`;
                        const on = !!matrix[key];
                        // The super admin's column is fixed — see the note at
                        // the top of this component.
                        const locked = level === "super_admin";
                        const saving = savingCell === key;
                        return (
                          <td key={level} className="px-2 py-2.5 text-center">
                            <button
                              type="button"
                              disabled={locked || saving}
                              onClick={() => toggle(cap.key, level)}
                              role="switch"
                              aria-checked={on}
                              aria-label={`${cap.label} for ${level}`}
                              title={
                                level === "super_admin"
                                  ? "The super admin always has every permission"
                                  : on
                                  ? "Granted — click to revoke"
                                  : "Not granted — click to grant"
                              }
                              className={cn(
                                "inline-flex h-5 w-5 items-center justify-center rounded border transition-colors",
                                on
                                  ? "border-togo-blue bg-togo-blue text-white"
                                  : "border-togo-border bg-togo-surface-2 text-transparent",
                                !locked && "hover:border-togo-blue",
                                locked && "cursor-not-allowed opacity-60",
                                saving && "opacity-50"
                              )}
                            >
                              {saving ? (
                                <Loader2 size={11} className="animate-spin text-togo-blue" />
                              ) : level === "super_admin" ? (
                                <Lock size={10} className="text-white" />
                              ) : (
                                on && <Check size={12} />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] leading-relaxed text-togo-faint">
        Two rules aren&apos;t in the grid because they&apos;re what keep it trustworthy: nobody can create an account
        above their own tier, and only the super admin can edit this page. Some capabilities also stay limited to
        rows you own — anyone can always edit their own updates and remove themselves from a project.
      </p>

      <div className="border-t border-togo-border pt-4">
        <MemberPermissions people={people} tierMatrix={matrix} />
      </div>
    </div>
  );
}

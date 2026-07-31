"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw, UserCog } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Select } from "@/components/ui/Input";
import { TierBadge } from "@/components/ui/TierBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { CAPABILITIES, CAPABILITY_GROUPS } from "@/lib/capabilities";
import { invalidateCurrentUser } from "@/lib/useCurrentUser";
import { cn } from "@/lib/utils";
import type { AccessLevel } from "@/types";

type State = "inherit" | "allow" | "deny";

interface Person {
  id: string;
  name: string;
  avatarUrl?: string | null;
  accessLevel: AccessLevel;
}

/**
 * Exceptions for one person, on top of what their tier allows.
 *
 * Three states rather than a checkbox: "inherit" has to be distinguishable from
 * "deny", or you can't take a capability away from one person without taking it
 * from their whole tier. Each row shows what the tier says, so it's obvious
 * whether an override is actually changing anything.
 */
export function MemberPermissions({
  people,
  tierMatrix,
}: {
  people: Person[];
  /** "capability:level" -> boolean, from the tier matrix above this panel. */
  tierMatrix: Record<string, boolean>;
}) {
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string>("");
  const [overrides, setOverrides] = useState<Record<string, boolean> | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [available, setAvailable] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Super admins can't have overrides — they hold everything unconditionally.
  const eligible = people.filter((p) => p.accessLevel !== "super_admin");
  const selected = eligible.find((p) => p.id === selectedId) || null;

  const load = useCallback(() => {
    fetch("/api/permissions/overrides")
      .then((res) => res.json())
      .then((data) => {
        setOverrides(data.overrides || {});
        setCounts(data.counts || {});
        setAvailable(data.available !== false);
      })
      .catch(() => setOverrides({}));
  }, []);

  useEffect(load, [load]);

  function stateOf(capability: string): State {
    if (!selected) return "inherit";
    const value = overrides?.[`${selected.id}:${capability}`];
    if (value === undefined) return "inherit";
    return value ? "allow" : "deny";
  }

  async function set(capability: string, next: State) {
    if (!selected) return;
    const key = `${selected.id}:${capability}`;
    const allowed = next === "inherit" ? null : next === "allow";

    setSavingKey(key);
    setOverrides((prev) => {
      const copy = { ...(prev || {}) };
      if (allowed === null) delete copy[key];
      else copy[key] = allowed;
      return copy;
    });

    const res = await fetch("/api/permissions/overrides", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selected.id, capability, allowed }),
    });
    setSavingKey(null);

    if (res.ok) {
      // Their own controls are driven by a cached capability list.
      invalidateCurrentUser();
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't save that override. Please try again.");
      load();
    }
  }

  async function clearAll() {
    if (!selected || !overrides) return;
    const mine = CAPABILITIES.filter((c) => overrides[`${selected.id}:${c.key}`] !== undefined);
    await Promise.all(
      mine.map((c) =>
        fetch("/api/permissions/overrides", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: selected.id, capability: c.key, allowed: null }),
        })
      )
    );
    invalidateCurrentUser();
    load();
    toast.success(`${selected.name} now inherits their tier for everything.`);
  }

  const overrideCount = selected ? counts[selected.id] || 0 : 0;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold text-togo-white">
          <UserCog size={15} className="text-togo-blue" />
          Per-person exceptions
        </h2>
        <p className="mt-1 text-xs text-togo-muted">
          Give one person more or less than their tier allows, without moving them to a different tier.
        </p>
      </div>

      {!available && (
        <p className="rounded-md border border-[var(--status-hold-border)] bg-[var(--status-hold-bg)] px-3 py-2 text-xs text-[var(--status-hold-fg)]">
          Run migration 033 in Supabase to enable per-person exceptions.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          aria-label="Choose a person"
          className="w-auto"
        >
          <option value="">Choose a person…</option>
          {eligible.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {counts[p.id] ? ` (${counts[p.id]} exception${counts[p.id] === 1 ? "" : "s"})` : ""}
            </option>
          ))}
        </Select>

        {selected && (
          <>
            <Avatar name={selected.name} avatarUrl={selected.avatarUrl} size="sm" className="shrink-0" />
            <TierBadge tier={selected.accessLevel} />
            {overrideCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1 text-xs font-medium text-togo-muted transition-colors hover:text-togo-blue"
              >
                <RotateCcw size={13} /> Reset to tier
              </button>
            )}
          </>
        )}
      </div>

      {!selected ? (
        <p className="rounded-md border border-togo-border bg-togo-surface px-4 py-6 text-center text-xs text-togo-muted">
          Pick someone to see how their access differs from their tier.
        </p>
      ) : overrides === null ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-togo-border bg-togo-surface">
          {CAPABILITY_GROUPS.map((group) => {
            const rows = CAPABILITIES.filter((c) => c.group === group);
            if (rows.length === 0) return null;
            return (
              <div key={group}>
                <div className="border-b border-togo-border bg-togo-surface-2/40 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-togo-muted">
                  {group}
                </div>
                {rows.map((cap) => {
                  const state = stateOf(cap.key);
                  const fromTier = !!tierMatrix[`${cap.key}:${selected.accessLevel}`];
                  const saving = savingKey === `${selected.id}:${cap.key}`;
                  return (
                    <div
                      key={cap.key}
                      className="flex flex-wrap items-center gap-3 border-b border-togo-border px-4 py-2.5 transition-colors hover:bg-[var(--togo-hover)] last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-togo-white">{cap.label}</div>
                        <div className="mt-0.5 text-[10px] text-togo-faint">
                          Their tier: {fromTier ? "allowed" : "not allowed"}
                          {state !== "inherit" && (
                            <span
                              className={cn(
                                "ml-1.5 font-semibold",
                                state === "allow"
                                  ? "text-[var(--status-completed-fg)]"
                                  : "text-[var(--status-blocked-fg)]"
                              )}
                            >
                              · overridden to {state === "allow" ? "allowed" : "denied"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        role="radiogroup"
                        aria-label={`${cap.label} for ${selected.name}`}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-0.5 rounded-md border border-togo-border bg-togo-surface-2 p-0.5",
                          saving && "opacity-50"
                        )}
                      >
                        {(["deny", "inherit", "allow"] as State[]).map((option) => {
                          const active = state === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              disabled={saving}
                              onClick={() => set(cap.key, option)}
                              className={cn(
                                "rounded px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                                active
                                  ? option === "allow"
                                    ? "bg-[var(--status-completed-fg)] text-white"
                                    : option === "deny"
                                    ? "bg-[var(--status-blocked-fg)] text-white"
                                    : "bg-togo-surface text-togo-white"
                                  : "text-togo-muted hover:text-togo-white"
                              )}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { Person as PermissionPerson };

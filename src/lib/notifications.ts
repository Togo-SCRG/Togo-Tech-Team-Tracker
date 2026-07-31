import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType =
  | "project_assigned"
  | "project_removed"
  | "project_created"
  | "project_overdue";

/**
 * Records in-app notifications for people affected by a project change.
 *
 * Deliberately best-effort: a notification failing must never fail the
 * assignment that triggered it. The write also silently no-ops on a database
 * where migration 019 hasn't been run yet, so deploy order doesn't matter.
 *
 * Pass the caller's own client, not the service-role one — RLS pins actor_id to
 * the session, which is what stops "who did this" being forged.
 */
export async function notify(
  supabase: SupabaseClient,
  {
    userIds,
    actorId,
    type,
    project,
    role,
    dedupeKey,
  }: {
    userIds: string[];
    /**
     * Who caused it, or null for system-generated notices (an overdue project
     * isn't anyone's doing). A null actor also means nobody is filtered out of
     * the recipient list.
     */
    actorId: string | null;
    type: NotificationType;
    project: string;
    role?: string | null;
    /**
     * Makes the notification idempotent per recipient. Used by the overdue
     * check, which runs on demand rather than on a schedule and would
     * otherwise re-raise the same notice on every page load.
     */
    dedupeKey?: string;
  }
): Promise<void> {
  // Never notify someone about their own action — adding yourself to a project
  // doesn't need telling.
  const recipients = Array.from(new Set(userIds)).filter((id) => id && (actorId === null || id !== actorId));
  if (recipients.length === 0) return;

  const rows = recipients.map((userId) => ({
    user_id: userId,
    actor_id: actorId,
    type,
    project: project.trim(),
    role: role?.trim() || null,
    ...(dedupeKey ? { dedupe_key: dedupeKey } : {}),
  }));

  // With a dedupe key, a repeat is a no-op rather than a duplicate row — the
  // unique index on (user_id, dedupe_key) is what enforces it (migration 027).
  const { error } = dedupeKey
    ? await supabase.from("notifications").upsert(rows, {
        onConflict: "user_id,dedupe_key",
        ignoreDuplicates: true,
      })
    : await supabase.from("notifications").insert(rows);

  if (error) {
    // Missing table (42P01) or missing column means migration 019 isn't applied.
    // Anything else is logged and swallowed for the same reason: the caller's
    // real work already succeeded and shouldn't be reported as failed.
    console.warn(`[notify] skipped ${type} for ${project}: ${error.message}`);
  }
}

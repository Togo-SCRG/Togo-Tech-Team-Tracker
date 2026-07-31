import type { SupabaseClient } from "@supabase/supabase-js";
import { CAPABILITIES } from "@/lib/capabilities";
import type { AccessLevel } from "@/types";

const ALL = CAPABILITIES.map((c) => c.key as string);

/**
 * The capabilities a tier holds, read from the permission matrix.
 *
 * This is the same answer `has_permission()` gives in SQL, resolved once per
 * request so the UI can decide what to render. It is *not* the enforcement —
 * every write still passes through the policies and the trigger, so a stale or
 * tampered list here changes what you see, never what you can do.
 */
export async function capabilitiesFor(
  supabase: SupabaseClient,
  accessLevel: AccessLevel | null | undefined,
  userId?: string | null
): Promise<string[]> {
  if (!accessLevel) return [];
  // The super admin is never gated, matching has_permission().
  if (accessLevel === "super_admin") return ALL;

  const { data, error } = await supabase
    .from("permissions")
    .select("capability, allowed")
    .eq("access_level", accessLevel);

  // Before migration 032 the table doesn't exist. Falling back to "everything"
  // keeps the app usable in that window — the database is still enforcing the
  // pre-matrix rules, so controls that shouldn't work simply error on save
  // rather than silently vanishing for every tier at once.
  if (error) return ALL;

  const granted = new Set((data || []).filter((r) => r.allowed).map((r) => r.capability as string));

  // Per-person overrides (033) win over the tier, in both directions: a row
  // with allowed = false is a real deny, which is why this can't just union.
  if (userId) {
    const { data: overrides } = await supabase
      .from("permission_overrides")
      .select("capability, allowed")
      .eq("user_id", userId);
    for (const row of overrides || []) {
      if (row.allowed) granted.add(row.capability as string);
      else granted.delete(row.capability as string);
    }
  }

  return [...granted];
}

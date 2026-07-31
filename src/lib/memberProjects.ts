import type { SupabaseClient } from "@supabase/supabase-js";

// Keeps a member's "My Projects" list in sync with what they actually log
// in the Task Tracker — if they log an update/time entry for a project
// they don't already have a My Projects card for, create one automatically
// (default status, no role/co-developers) instead of requiring a separate
// manual "Add Project" step. Existing cards are left untouched so manual
// edits (role, partners, a deliberately different status) aren't clobbered.
export async function ensureMemberProject(
  supabase: SupabaseClient,
  userId: string,
  project: string,
  status: string
) {
  const trimmed = project.trim();
  if (!trimmed) return;

  const { data: existing } = await supabase
    .from("member_projects")
    .select("id")
    .eq("user_id", userId)
    .eq("project", trimmed)
    .maybeSingle();

  if (existing) return;

  await supabase.from("member_projects").insert({
    user_id: userId,
    project: trimmed,
    status: status || "In Progress",
    role: "",
    partner_ids: [],
  });
}

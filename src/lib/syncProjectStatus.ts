import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Push the status chosen on a daily update onto the project itself.
 *
 * The two used to drift: the update form's status only ever described that one
 * update, so a project could sit at "Not Started" while every update against it
 * said "In Progress". Treating the field as the project's status keeps one
 * answer to "where is this project?".
 *
 * Best-effort by design. The caller has already saved the update, and the
 * status is a secondary effect — if the writer isn't allowed to change this
 * project's status (migration 032's `project.status.edit`, plus the membership
 * rule from 028), the update still stands and their own row keeps the status
 * they picked. Failing the whole save would be worse.
 *
 * Call this *after* the update row is written and member_projects is seeded:
 * logging an update is what makes someone a member of the project, which is
 * what the trigger checks.
 */
export async function syncProjectStatus(
  supabase: SupabaseClient,
  project: string,
  status: string | null | undefined
): Promise<void> {
  if (!project || !status) return;

  const { error } = await supabase
    .from("project_settings")
    .upsert({ project, status }, { onConflict: "project" });

  if (error) {
    console.warn(`[syncProjectStatus] ${project} -> ${status}: ${error.message}`);
  }
}

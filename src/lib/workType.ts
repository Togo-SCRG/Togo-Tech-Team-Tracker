/**
 * Whether a logged row is against a project or a standalone task.
 *
 * Tasks are meetings, onboarding, support, admin — real work with real hours,
 * but not something with a status, a timeline or a team. They're named the same
 * way projects are (free text), so the name column alone can't tell them apart:
 * this is what does.
 *
 * The rule everywhere: **a task is never a project.** It doesn't appear in the
 * projects list, doesn't get a project page, doesn't count towards "12 active
 * projects", and logging one doesn't make you a member of anything.
 */
export type WorkType = "project" | "task";

export const WORK_TYPES: WorkType[] = ["project", "task"];

/** Anything unrecognised is project work — the default, and what every row was before migration 040. */
export function normaliseWorkType(value: unknown): WorkType {
  return value === "task" ? "task" : "project";
}

export function isTask(value: unknown): boolean {
  return value === "task";
}

/** Label for the kind of thing, for a heading or a picker. */
export function workTypeLabel(type: WorkType): string {
  return type === "task" ? "Task" : "Project";
}

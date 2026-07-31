/**
 * A project's timeline is free text — "End of Q3", "2 sprints", "Aug 15, 2026".
 * Only the ones that name an actual date can go overdue; everything else is a
 * note for humans and is left alone rather than guessed at.
 */

/** Parsed as UTC midnight, matching how dates are handled elsewhere. */
export function parseTimelineDate(timeline: string | null | undefined): Date | null {
  const text = timeline?.trim();
  if (!text) return null;

  // Rejects bare numbers and things like "6 weeks" that Date.parse would
  // otherwise coerce into a year. Requires a month name or a date separator.
  const looksLikeADate = /\d/.test(text) && (/[a-z]{3}/i.test(text) || /[/-]/.test(text));
  if (!looksLikeADate) return null;

  const ms = Date.parse(text);
  if (Number.isNaN(ms)) return null;

  const parsed = new Date(ms);
  // Normalise to UTC midnight so comparisons are whole days, not moments.
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

/** Today at UTC midnight. */
export function todayUTC(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Overdue means the named day has passed and the project isn't finished.
 * The deadline day itself is not overdue — you have until the end of it.
 */
export function isTimelineOverdue(
  timeline: string | null | undefined,
  status: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (status === "Completed") return false;
  const due = parseTimelineDate(timeline);
  if (!due) return false;
  return due.getTime() < todayUTC(now).getTime();
}

/** Whole days past the deadline, for wording like "3 days overdue". */
export function daysOverdue(timeline: string | null | undefined, now: Date = new Date()): number {
  const due = parseTimelineDate(timeline);
  if (!due) return 0;
  const diff = todayUTC(now).getTime() - due.getTime();
  return diff > 0 ? Math.floor(diff / 86_400_000) : 0;
}

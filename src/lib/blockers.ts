/**
 * Things people type into a blockers field to mean "nothing is blocking me".
 *
 * The field is free text and gets filled in on every update, so it collects
 * placeholders. Each one used to count as a real blocker: projects were marked
 * held up by "N/A", the dashboard's blocker tile was inflated, and the tracker
 * showed a red warning triangle next to text saying there was no problem.
 *
 * Matched as a **whole value**, lowercased, with surrounding whitespace and
 * bullet/punctuation characters stripped. So "N/A", "n/a.", "- None " and
 * "NOTHING" all match, while "no access to the staging server" does not — it
 * only starts with "no", it isn't the word on its own.
 */
const NOT_A_BLOCKER = new Set([
  // Explicitly nothing
  "na",
  "n/a",
  "n.a",
  "nil",
  "none",
  "no",
  "nope",
  "nothing",
  "not applicable",
  // "No <noun>" phrasings
  "no blocker",
  "no blockers",
  "no issue",
  "no issues",
  "no concern",
  "no concerns",
  "no problem",
  "no problems",
  "no risk",
  "no risks",
  // Finished, so nothing outstanding
  "done",
  "complete",
  "completed",
  "finished",
  "resolved",
  "cleared",
  // Everything's fine
  "ok",
  "okay",
  "fine",
  "good",
  "all good",
  "all clear",
  "clear",
]);

/**
 * Whether a blockers value represents something actually blocking.
 *
 * Used in two ways, deliberately:
 *
 * 1. **Counting** — the dashboard tile and banner, the projects-list badge, and
 *    the project page's Blockers card all exclude these values, so a "N/A"
 *    never marks a project as held up.
 * 2. **Styling** — the tracker table, card view and detail modal still *show*
 *    the text, but without the red colour and warning icon. The text staying
 *    visible is the point: it distinguishes "answered, nothing blocking" from
 *    "left blank".
 *
 * Both uses share this one predicate so a badge and a column can never disagree
 * about whether the same row is blocked.
 */
export function isRealBlocker(text: string | null | undefined): boolean {
  if (!text) return false;

  // Leading/trailing bullets, dashes, dots and colons only — people write
  // "- N/A" and "None." A blanket strip of non-letters would turn a genuine
  // one-character "?" into an empty string and hide it.
  const normalised = text
    .trim()
    .toLowerCase()
    .replace(/^[\s\-–—.:*•]+/, "")
    .replace(/[\s\-–—.:*•]+$/, "");

  if (normalised === "") return false;
  return !NOT_A_BLOCKER.has(normalised);
}

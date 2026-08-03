/**
 * Words people type into a blockers field to mean "nothing is blocking me".
 *
 * The field is free text and gets filled in on every update, so it collects
 * placeholders — and each one was counting as a real blocker, marking projects
 * held up by "N/A" and inflating the dashboard's blocker tile.
 *
 * Compared lowercased with surrounding whitespace and trailing punctuation
 * stripped, so "N/A", "n/a.", and " None " all match.
 */
const NOT_A_BLOCKER = new Set([
  "na",
  "n/a",
  "none",
  "no",
  "done",
  "complete",
  "completed",
]);

/**
 * Whether a blockers value represents something actually blocking.
 *
 * Use this everywhere a blocker is **counted** or **listed as outstanding**.
 * Deliberately not used where the text is merely displayed — the Blockers column
 * on the updates table still shows whatever was typed, because hiding it would
 * lose the fact that someone answered the question at all.
 */
export function isRealBlocker(text: string | null | undefined): boolean {
  if (!text) return false;
  // Trailing dots and slashes only: stripping every non-letter would turn a
  // genuine "?" or "!" blocker into an empty string.
  const normalised = text.trim().toLowerCase().replace(/[.\s]+$/, "");
  if (normalised === "") return false;
  return !NOT_A_BLOCKER.has(normalised);
}

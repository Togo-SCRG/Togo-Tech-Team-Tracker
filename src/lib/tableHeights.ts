/**
 * Minimum body heights for the paginated tables, sized to a full page of ten.
 *
 * The problem these solve: with a page size of ten, a full page is ten rows —
 * but the last page, or a filtered result, might be two. The panel then collapses
 * to two rows tall and the page jumps around as you filter or turn pages. A
 * minimum keeps it still.
 *
 * `min-height`, not `height`: raising the page size to 15 or 50 should grow the
 * table, not trap it in a nested scrollbar.
 *
 * The dashboard's two panels deliberately use none of these: they sit side by
 * side and are each as tall as their own content, so a minimum on either would
 * reintroduce the dead space it was there to prevent elsewhere.
 *
 * Each value is ten times that table's own row height, which differs because the
 * rows differ: the tallest cell is usually an avatar, and the vertical padding
 * isn't uniform either. The arithmetic is spelled out so it can be re-checked
 * rather than trusted.
 *
 *   row height = tallest cell + vertical padding + the 1px divider
 */

/** Avatar `!h-7` (28px) + `py-2.5` (10+10) + 1px = 49px. */
export const TEN_ROWS_TRACKER = "min-h-[490px]";

/** Avatar `size="sm"` (32px) + `py-3` (12+12) + 1px = 57px. */
export const TEN_ROWS_PY3 = "min-h-[570px]";

/** Avatar `size="sm"` (32px) + `py-2.5` (10+10) + 1px = 53px. */
export const TEN_ROWS_PY25 = "min-h-[530px]";

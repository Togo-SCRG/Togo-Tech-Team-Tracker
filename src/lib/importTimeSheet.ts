/**
 * Reading a time log out of a spreadsheet.
 *
 * The sheets these come from are written for people, not for machines: a merged
 * title row, a subtitle naming the project and the week, then the real header,
 * then the rows, then a TOTAL line and a note about the weekly cap. One workbook
 * holds a sheet per week.
 *
 * So the parser can't assume row 1 is the header or that every row is data. It
 * finds the header, and then takes a row only if it yields **both** a date and a
 * positive duration — which is what separates a real entry from a title, a
 * total, a cap note or a blank spacer, without needing to recognise any of them
 * by name.
 */

export interface SheetGrid {
  name: string;
  /** Raw cells. Strings, numbers, Dates or null, exactly as the sheet had them. */
  rows: unknown[][];
}

export type TimeField = "date" | "hours" | "phase" | "note";

/** Field → column index. -1 means "not mapped". */
export type ColumnMapping = Record<TimeField, number>;

export interface ParsedEntry {
  date: string;
  durationMinutes: number;
  phase: string;
  note: string;
  /** For the preview — which sheet and row this came from. */
  sheet: string;
  rowNumber: number;
}

export interface SkippedRow {
  sheet: string;
  rowNumber: number;
  reason: string;
  preview: string;
}

// ---------------------------------------------------------------- reading

/**
 * `xlsx` is a large library, so it's imported on demand — the same reasoning as
 * exportExcel.ts. This only runs once someone actually picks a file.
 */
export async function readWorkbook(file: File): Promise<SheetGrid[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  // cellDates so real date cells arrive as Dates rather than serial numbers.
  const workbook = XLSX.read(buffer, { cellDates: true });

  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: null,
      // Blank rows kept: dropping them would shift every row number and make the
      // "row 14 was skipped" messages point at the wrong line in Excel.
      blankrows: true,
    });
    return { name, rows };
  });
}

/** "A", "B", … "AA" — how the column reads in Excel's own header. */
export function excelColumnName(index: number): string {
  let name = "";
  let n = index;
  while (n >= 0) {
    name = String.fromCharCode((n % 26) + 65) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

export function cellText(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toDateString();
  return String(cell).trim();
}

// ---------------------------------------------------------------- detection

const HEADER_HINTS: Record<TimeField, string[]> = {
  date: ["period", "date", "day", "when"],
  hours: ["hours", "hour", "hrs", "duration", "time spent", "time"],
  phase: ["phase", "category", "type", "area", "task type"],
  note: ["work done", "description", "details", "notes", "note", "summary", "task", "work"],
};

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * The row that looks like column headings: the one matching the most field
 * hints, needing at least two so a stray "Total hours" line can't win.
 *
 * Only the first 25 rows are considered — a header further down than that means
 * the file isn't the shape this importer is for.
 */
export function detectHeaderRow(rows: unknown[][]): number {
  let best = -1;
  let bestScore = 1;

  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const cells = (rows[i] || []).map((c) => normalise(cellText(c)));
    if (cells.every((c) => c === "")) continue;

    let score = 0;
    for (const hints of Object.values(HEADER_HINTS)) {
      if (cells.some((cell) => cell !== "" && hints.some((h) => cell.includes(h)))) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/** Best guess at which column holds which field, by header text. */
export function detectMapping(headerCells: unknown[]): ColumnMapping {
  const normalised = (headerCells || []).map((c) => normalise(cellText(c)));
  const mapping: ColumnMapping = { date: -1, hours: -1, phase: -1, note: -1 };
  const taken = new Set<number>();

  // Longest hint first, so "work done" beats the bare "work", and "duration"
  // isn't claimed by a column actually headed "time spent".
  for (const field of ["hours", "date", "phase", "note"] as TimeField[]) {
    const hints = [...HEADER_HINTS[field]].sort((a, b) => b.length - a.length);
    for (const hint of hints) {
      const index = normalised.findIndex((cell, i) => !taken.has(i) && cell !== "" && cell.includes(hint));
      if (index !== -1) {
        mapping[field] = index;
        taken.add(index);
        break;
      }
    }
  }
  return mapping;
}

/**
 * A year from the rows above the header — the subtitle usually carries one
 * ("Jul 1–3, 2026"), because the date cells themselves often don't.
 */
export function detectYear(rows: unknown[][], headerRowIndex: number): number | null {
  const limit = headerRowIndex >= 0 ? headerRowIndex : Math.min(rows.length, 10);
  for (let i = 0; i < limit; i++) {
    for (const cell of rows[i] || []) {
      const match = cellText(cell).match(/\b(20\d{2})\b/);
      if (match) return Number(match[1]);
    }
  }
  return null;
}

// ---------------------------------------------------------------- cell parsing

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function iso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * A date cell to `yyyy-mm-dd`.
 *
 * `fallbackYear` covers the common case in these sheets: the cell says
 * "Jul 1 (Wed)" and the year lives in the subtitle, or nowhere at all.
 */
export function parseDateCell(cell: unknown, fallbackYear: number): string | null {
  if (cell === null || cell === undefined || cell === "") return null;

  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    return iso(cell.getFullYear(), cell.getMonth() + 1, cell.getDate());
  }

  if (typeof cell === "number") {
    // An Excel serial date, but only in a plausible range — otherwise a bare
    // number in this column is far more likely to be a stray value than a date
    // in 1902. 20000 ≈ 1954, 60000 ≈ 2064.
    if (cell < 20000 || cell > 60000) return null;
    const epoch = Date.UTC(1899, 11, 30);
    const d = new Date(epoch + Math.round(cell) * 86400000);
    return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  // Drop the weekday in brackets: "Jul 1 (Wed)".
  const text = String(cell).replace(/\([^)]*\)/g, " ").trim();
  if (text === "") return null;

  const yearMatch = text.match(/\b(20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : fallbackYear;

  // "Jul 1", "July 1, 2026", "1 Jul"
  const monthFirst = text.match(/\b([a-z]{3,9})\b[\s.]*(\d{1,2})\b/i);
  if (monthFirst) {
    const month = MONTHS[monthFirst[1].toLowerCase()];
    if (month) return iso(year, month, Number(monthFirst[2]));
  }
  const dayFirst = text.match(/\b(\d{1,2})[\s.]*([a-z]{3,9})\b/i);
  if (dayFirst) {
    const month = MONTHS[dayFirst[2].toLowerCase()];
    if (month) return iso(year, month, Number(dayFirst[1]));
  }

  // 2026-07-01
  const ymd = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (ymd) return iso(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));

  // 07/01/2026 — read month-first, matching how dates display elsewhere in the
  // hub ("Aug 3, 2026"). A day-first sheet would need this changed.
  const mdy = text.match(/\b(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?\b/);
  if (mdy) {
    const y = mdy[3] ? Number(mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3]) : year;
    return iso(y, Number(mdy[1]), Number(mdy[2]));
  }

  return null;
}

/** An hours cell to whole minutes. Returns null when it isn't a usable number. */
export function parseHoursCell(cell: unknown): number | null {
  if (cell === null || cell === undefined || cell === "") return null;

  if (typeof cell === "number") {
    return cell > 0 ? Math.round(cell * 60) : null;
  }

  const text = String(cell).trim().toLowerCase();
  if (text === "") return null;

  // "1:30" — an hours:minutes duration.
  const clock = text.match(/^(\d+):([0-5]?\d)$/);
  if (clock) {
    const minutes = Number(clock[1]) * 60 + Number(clock[2]);
    return minutes > 0 ? minutes : null;
  }

  // "90m", "90 mins" — already minutes, so don't multiply.
  const mins = text.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)$/);
  if (mins) {
    const minutes = Math.round(Number(mins[1]));
    return minutes > 0 ? minutes : null;
  }

  const hours = text.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)?$/);
  if (hours) {
    const minutes = Math.round(Number(hours[1]) * 60);
    return minutes > 0 ? minutes : null;
  }

  return null;
}

// ---------------------------------------------------------------- parsing

export interface ParseResult {
  entries: ParsedEntry[];
  skipped: SkippedRow[];
}

/**
 * Every data row of one sheet.
 *
 * A row is taken only when it has both a date and a positive duration. That one
 * rule is what silently drops the title, the subtitle, the header, blank
 * spacers, the TOTAL line and the cap note — none of which have both.
 *
 * Rows that have *some* of what's needed are reported as skipped with a reason,
 * so a genuine mistake (a typo'd date, hours written as "TBD") is visible rather
 * than quietly dropped.
 */
export function parseSheet(
  grid: SheetGrid,
  headerRowIndex: number,
  mapping: ColumnMapping,
  fallbackYear: number
): ParseResult {
  const entries: ParsedEntry[] = [];
  const skipped: SkippedRow[] = [];

  const start = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

  for (let i = start; i < grid.rows.length; i++) {
    const row = grid.rows[i] || [];
    // 1-based, like Excel's own row numbers, so a reported row can be found.
    const rowNumber = i + 1;

    const at = (field: TimeField) => (mapping[field] >= 0 ? row[mapping[field]] : null);

    const dateCell = at("date");
    const hoursCell = at("hours");
    const phase = cellText(at("phase"));
    const note = cellText(at("note"));

    const allText = [dateCell, hoursCell, phase, note].map(cellText).join(" ").trim();
    if (allText === "") continue; // blank spacer — not worth reporting

    // Belt and braces: a totals line that somehow carries a date shouldn't
    // become a 18-hour entry.
    if (/^(total|grand total|sum|weekly cap)/i.test(phase) || /^(total|grand total|sum)/i.test(note)) {
      continue;
    }

    const date = parseDateCell(dateCell, fallbackYear);
    const durationMinutes = parseHoursCell(hoursCell);

    if (date && durationMinutes) {
      entries.push({ date, durationMinutes, phase, note, sheet: grid.name, rowNumber });
      continue;
    }

    // Only worth flagging if the row looked like it was trying to be an entry.
    const looksLikeData = !!date || !!durationMinutes || note !== "";
    if (looksLikeData) {
      skipped.push({
        sheet: grid.name,
        rowNumber,
        reason: !date && !durationMinutes ? "No date or hours" : !date ? "Couldn't read the date" : "Couldn't read the hours",
        preview: allText.slice(0, 80),
      });
    }
  }

  return { entries, skipped };
}

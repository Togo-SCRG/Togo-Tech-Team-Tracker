"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, FileSpreadsheet, Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { cn, formatMinutes } from "@/lib/utils";
import {
  cellText,
  detectHeaderRow,
  detectMapping,
  detectYear,
  excelColumnName,
  parseSheet,
  readWorkbook,
  type ColumnMapping,
  type SheetGrid,
  type TimeField,
} from "@/lib/importTimeSheet";
import type { CurrentUser, MemberItem } from "@/types";

const FIELDS: { key: TimeField; label: string; hint: string; required: boolean }[] = [
  { key: "date", label: "Date", hint: "e.g. “Jul 1 (Wed)”", required: true },
  { key: "hours", label: "Hours", hint: "e.g. 2, 2.5, 1:30", required: true },
  { key: "phase", label: "Phase", hint: "Becomes the phase tag", required: false },
  { key: "note", label: "What was done", hint: "Becomes the entry's note", required: false },
];

/**
 * Import a time log from a spreadsheet into one project.
 *
 * The sheets this reads are written for people: a title, a subtitle, the real
 * header, the rows, a total, a cap note — and one sheet per week. So the flow is
 * pick file → choose which sheets → confirm the column mapping → check the
 * preview → import. Everything is auto-detected first; the controls are there to
 * correct a wrong guess, not to do the work.
 */
export function TimeImportModal({
  open,
  onClose,
  onImported,
  projectName,
  currentUser,
  members,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  projectName: string;
  currentUser: CurrentUser;
  members: MemberItem[];
}) {
  const toast = useToast();
  const [fileName, setFileName] = useState("");
  const [sheets, setSheets] = useState<SheetGrid[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [headerRows, setHeaderRows] = useState<Record<string, number>>({});
  const [mapping, setMapping] = useState<ColumnMapping>({ date: -1, hours: -1, phase: -1, note: -1 });
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [userId, setUserId] = useState(currentUser.id);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);

  function reset() {
    setFileName("");
    setSheets([]);
    setSelected(new Set());
    setHeaderRows({});
    setMapping({ date: -1, hours: -1, phase: -1, note: -1 });
    setUserId(currentUser.id);
  }

  async function handleFile(file: File) {
    setReading(true);
    try {
      const grids = await readWorkbook(file);
      if (grids.length === 0) {
        toast.error("That file has no sheets in it.");
        return;
      }

      const detectedHeaders: Record<string, number> = {};
      for (const grid of grids) detectedHeaders[grid.name] = detectHeaderRow(grid.rows);

      // Mapping comes from the first sheet that has a header, and is then applied
      // to every selected sheet — a weekly workbook is the same template copied,
      // so one mapping is right for all of them.
      const source = grids.find((g) => detectedHeaders[g.name] >= 0) ?? grids[0];
      const sourceHeader = detectedHeaders[source.name];
      const guessed = sourceHeader >= 0 ? detectMapping(source.rows[sourceHeader] || []) : { date: -1, hours: -1, phase: -1, note: -1 };

      // The date cells usually carry no year — the subtitle does.
      const foundYear = grids.map((g) => detectYear(g.rows, detectedHeaders[g.name])).find((y) => y != null);

      setFileName(file.name);
      setSheets(grids);
      setHeaderRows(detectedHeaders);
      setMapping(guessed);
      if (foundYear) setYear(foundYear);
      // Every sheet on by default — a workbook of weeks is normally imported whole.
      setSelected(new Set(grids.map((g) => g.name)));
    } catch {
      toast.error("Couldn't read that file. Is it a .xlsx, .xls or .csv?");
    } finally {
      setReading(false);
    }
  }

  /** Columns offered in the mapping selects, labelled as Excel labels them. */
  const columnOptions = useMemo(() => {
    if (sheets.length === 0) return [];
    const source = sheets.find((g) => selected.has(g.name)) ?? sheets[0];
    const headerIndex = headerRows[source.name] ?? -1;
    const width = Math.max(...source.rows.slice(0, 40).map((r) => (r || []).length), 0);
    const header = headerIndex >= 0 ? source.rows[headerIndex] || [] : [];

    return Array.from({ length: width }, (_, i) => {
      const text = cellText(header[i]);
      return { index: i, label: text ? `${excelColumnName(i)} — ${text}` : excelColumnName(i) };
    });
  }, [sheets, selected, headerRows]);

  const parsed = useMemo(() => {
    const entries = [];
    const skipped = [];
    for (const grid of sheets) {
      if (!selected.has(grid.name)) continue;
      const result = parseSheet(grid, headerRows[grid.name] ?? -1, mapping, year);
      entries.push(...result.entries);
      skipped.push(...result.skipped);
    }
    return { entries, skipped };
  }, [sheets, selected, headerRows, mapping, year]);

  const totalMinutes = parsed.entries.reduce((sum, e) => sum + e.durationMinutes, 0);
  const ready = mapping.date >= 0 && mapping.hours >= 0 && parsed.entries.length > 0;

  /** Rows per sheet, so a sheet contributing nothing is obvious before importing. */
  const countsBySheet = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of parsed.entries) counts.set(e.sheet, (counts.get(e.sheet) || 0) + 1);
    return counts;
  }, [parsed.entries]);

  async function handleImport() {
    setImporting(true);
    const res = await fetch("/api/time-entries/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project: projectName,
        userId,
        rows: parsed.entries.map((e) => ({
          date: e.date,
          durationMinutes: e.durationMinutes,
          phase: e.phase,
          note: e.note,
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setImporting(false);

    if (!res.ok) {
      toast.error(data.error || "Couldn't import those entries. Please try again.");
      return;
    }

    toast.success(
      `Imported ${data.imported} ${data.imported === 1 ? "entry" : "entries"} (${formatMinutes(totalMinutes)}).`
    );
    onImported();
    reset();
    onClose();
  }

  function close() {
    reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title="Import time log" className="max-w-3xl">
      <div className="space-y-4">
        {sheets.length === 0 ? (
          <>
            <p className="text-xs text-togo-muted">
              Reads a spreadsheet of logged hours into <span className="text-togo-white">{projectName}</span>. One sheet
              per week is fine — each is read separately. Titles, totals and cap notes are ignored automatically.
            </p>
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-togo-border px-4 py-10 text-center transition-colors hover:border-togo-blue",
                reading && "pointer-events-none opacity-60"
              )}
            >
              <FileSpreadsheet size={22} className="text-togo-faint" />
              <span className="text-sm text-togo-white">
                {reading ? "Reading…" : "Choose a spreadsheet"}
              </span>
              <span className="text-[11px] text-togo-faint">.xlsx, .xls or .csv</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 rounded-md border border-togo-border bg-togo-surface-2/40 px-3 py-2">
              <FileSpreadsheet size={14} className="shrink-0 text-togo-blue" />
              <span className="min-w-0 flex-1 truncate text-xs text-togo-white">{fileName}</span>
              <button
                type="button"
                onClick={reset}
                className="shrink-0 text-[11px] text-togo-faint transition-colors hover:text-togo-blue"
              >
                Choose another
              </button>
            </div>

            {/* Sheets */}
            <div>
              <Label>Sheets to import</Label>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-togo-border p-2">
                {sheets.map((grid) => {
                  const on = selected.has(grid.name);
                  const count = countsBySheet.get(grid.name) ?? 0;
                  return (
                    <label
                      key={grid.name}
                      className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs transition-colors hover:bg-[var(--togo-hover)]"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(grid.name)) next.delete(grid.name);
                            else next.add(grid.name);
                            return next;
                          })
                        }
                        className="h-3.5 w-3.5 accent-[var(--togo-blue)]"
                      />
                      <span className="min-w-0 flex-1 truncate text-togo-white">{grid.name}</span>
                      <span className="tnum shrink-0 text-[10px] text-togo-faint">
                        {on ? `${count} ${count === 1 ? "row" : "rows"}` : "skipped"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Column mapping */}
            <div>
              <Label hint="Detected from the sheet's header row — change if it guessed wrong">
                Column mapping
              </Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {FIELDS.map((field) => (
                  <div key={field.key}>
                    <label className="mb-1 block text-[11px] text-togo-muted" htmlFor={`map-${field.key}`}>
                      {field.label}
                      {field.required && <span className="ml-0.5 text-[var(--status-blocked-fg)]">*</span>}
                      <span className="ml-1.5 text-togo-faint">{field.hint}</span>
                    </label>
                    <Select
                      id={`map-${field.key}`}
                      value={String(mapping[field.key])}
                      onChange={(e) =>
                        setMapping((prev) => ({ ...prev, [field.key]: Number(e.target.value) }))
                      }
                      className="py-1.5 text-xs"
                    >
                      <option value="-1">{field.required ? "— pick a column —" : "— not imported —"}</option>
                      {columnOptions.map((c) => (
                        <option key={c.index} value={c.index}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <Label htmlFor="import-year" hint="Used when a date cell has no year">
                  Year
                </Label>
                <Input
                  id="import-year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="py-1.5 text-xs"
                />
              </div>
              <div>
                <Label htmlFor="import-user" hint="Every imported row is logged to this person">
                  Log time as
                </Label>
                <Select
                  id="import-user"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="py-1.5 text-xs"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Preview */}
            <div>
              <Label
                hint={
                  parsed.entries.length > 0
                    ? `${parsed.entries.length} ${parsed.entries.length === 1 ? "entry" : "entries"} · ${formatMinutes(totalMinutes)}`
                    : undefined
                }
              >
                Preview
              </Label>
              {parsed.entries.length === 0 ? (
                <p className="rounded-md border border-togo-border px-3 py-4 text-center text-xs italic text-togo-faint">
                  {mapping.date < 0 || mapping.hours < 0
                    ? "Map the date and hours columns to see what will be imported."
                    : "No rows could be read from the selected sheets."}
                </p>
              ) : (
                <div className="max-h-52 overflow-auto rounded-md border border-togo-border">
                  <table className="w-full min-w-[520px] text-xs">
                    <thead className="sticky top-0 bg-togo-surface-2">
                      <tr className="text-left text-[10px] uppercase tracking-wider text-togo-faint">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Hours</th>
                        <th className="px-3 py-2">Phase</th>
                        <th className="px-3 py-2">What was done</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-togo-border">
                      {parsed.entries.slice(0, 50).map((e) => (
                        <tr key={`${e.sheet}-${e.rowNumber}`}>
                          <td className="tnum whitespace-nowrap px-3 py-1.5 text-togo-muted">{e.date}</td>
                          <td className="tnum whitespace-nowrap px-3 py-1.5 font-semibold text-togo-blue">
                            {formatMinutes(e.durationMinutes)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-1.5 text-togo-muted">{e.phase || "—"}</td>
                          <td className="max-w-[260px] truncate px-3 py-1.5 text-togo-muted" title={e.note}>
                            {e.note || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.entries.length > 50 && (
                    <p className="border-t border-togo-border px-3 py-1.5 text-[10px] text-togo-faint">
                      Showing the first 50 of {parsed.entries.length} — all of them will be imported.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Rows that looked like data but couldn't be read. Reported rather
                than silently dropped — a typo'd date is a mistake, not noise. */}
            {parsed.skipped.length > 0 && (
              <details className="rounded-md border border-[var(--status-hold-border)] bg-[var(--status-hold-bg)] px-3 py-2">
                <summary className="flex cursor-pointer items-center gap-1.5 text-xs text-[var(--status-hold-fg)]">
                  <AlertTriangle size={12} className="shrink-0" />
                  {parsed.skipped.length} {parsed.skipped.length === 1 ? "row" : "rows"} will be skipped
                </summary>
                <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-[11px] text-togo-muted">
                  {parsed.skipped.slice(0, 30).map((s) => (
                    <li key={`${s.sheet}-${s.rowNumber}`}>
                      <span className="text-togo-faint">
                        {s.sheet} row {s.rowNumber}:
                      </span>{" "}
                      {s.reason} — <span className="italic">{s.preview}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div className="flex items-center gap-3 border-t border-togo-border pt-3">
              <Button onClick={handleImport} disabled={!ready || importing}>
                <Upload size={14} />
                {importing
                  ? "Importing…"
                  : `Import ${parsed.entries.length} ${parsed.entries.length === 1 ? "entry" : "entries"}`}
              </Button>
              <button
                type="button"
                onClick={close}
                disabled={importing}
                className="text-xs text-togo-faint transition-colors hover:text-togo-muted disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

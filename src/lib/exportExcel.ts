// `xlsx` (SheetJS) is a sizeable library — imported dynamically so only
// pages that actually export data (Task Tracker) pull it into their
// bundle, instead of it bloating every page via a shared utils import.
export async function downloadExcel(
  filename: string,
  sheetName: string,
  header: string[],
  rows: (string | number)[][]
) {
  const XLSX = await import("xlsx");

  const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);

  worksheet["!cols"] = header.map((h, colIndex) => {
    const maxLen = Math.max(h.length, ...rows.map((r) => String(r[colIndex] ?? "").length));
    return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

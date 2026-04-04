import * as XLSX from "xlsx";
import type { FarmImportRawRow } from "./types";

export class ParseXlsxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseXlsxError";
  }
}

function cellToString(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") {
    return Number.isFinite(v) ? String(v) : "";
  }
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? "" : v.toISOString().slice(0, 10);
  }
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v).trim();
}

function rowToStrings(row: unknown): string[] {
  if (!Array.isArray(row)) return [];
  return row.map((c) => cellToString(c));
}

/**
 * Parses the first worksheet of an .xlsx workbook into the same header/row shape as CSV import.
 */
export function parseXlsxBuffer(buffer: Buffer): { headers: string[]; rows: FarmImportRawRow[] } {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch {
    throw new ParseXlsxError(
      "We could not read this Excel file. Make sure it is a valid .xlsx workbook and try again."
    );
  }

  const firstName = workbook.SheetNames[0];
  if (!firstName) {
    return { headers: [], rows: [] };
  }
  const sheet = workbook.Sheets[firstName];
  if (!sheet) {
    return { headers: [], rows: [] };
  }

  let aoa: unknown[][];
  try {
    aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });
  } catch {
    throw new ParseXlsxError(
      "We could not read the sheet data in this file. Try re-saving the workbook as .xlsx and upload again."
    );
  }

  const records = aoa.map((r) => rowToStrings(r));
  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = records[0].map((h) => h.trim()).filter((h) => h.length > 0);
  const rows: FarmImportRawRow[] = [];

  for (let i = 1; i < records.length; i += 1) {
    const record = records[i];
    if (record.every((cell) => cell.trim().length === 0)) continue;
    const row: FarmImportRawRow = {};
    for (let c = 0; c < headers.length; c += 1) {
      row[headers[c]] = (record[c] ?? "").trim();
    }
    rows.push(row);
  }

  return { headers, rows };
}

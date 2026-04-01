import type { FarmImportRawRow } from "./types";

export function parseCsvText(input: string): { headers: string[]; rows: FarmImportRawRow[] } {
  const text = input.replace(/^\uFEFF/, "").trim();
  if (!text) return { headers: [], rows: [] };

  const records = parseCsvRecords(text);
  if (records.length === 0) return { headers: [], rows: [] };

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

function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = i + 1 < text.length ? text[i + 1] : "";

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      records.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (ch === "\r") continue;
    cell += ch;
  }

  row.push(cell);
  records.push(row);
  return records;
}

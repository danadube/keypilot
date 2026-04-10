/** Sale price: empty → null (clear); invalid → undefined (validation error). */
export function parseOptionalSalePriceInput(s: string): number | null | undefined {
  const t = s.trim().replace(/,/g, "");
  if (!t) return null;
  const n = parseFloat(t);
  if (Number.isNaN(n) || n <= 0) return undefined;
  return n;
}

/** Base commission: empty → null (clear single line); invalid → undefined. */
export function parseOptionalBaseCommissionInput(s: string): number | null | undefined {
  const t = s.trim().replace(/,/g, "");
  if (!t) return null;
  const n = parseFloat(t);
  if (Number.isNaN(n) || n < 0) return undefined;
  if (n === 0) return null;
  return n;
}

export function salePriceToInput(v: string | number | null) {
  if (v == null || v === "") return "";
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isNaN(n) ? "" : String(n);
}

export function isoToDateInput(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

/**
 * Shared parsing for optional numeric form fields (commission %, fees, etc.).
 * Empty input → null. Non-empty must be finite (never NaN/Infinity) or `invalid` is true.
 */
export function parseOptionalFiniteNumberInput(s: string): {
  value: number | null;
  invalid: boolean;
} {
  const t = s.trim();
  if (!t) return { value: null, invalid: false };
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n)) return { value: null, invalid: true };
  return { value: n, invalid: false };
}

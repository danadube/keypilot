/**
 * Parse optional dueAt from API (ISO 8601 datetime string).
 */
export function parseOptionalTaskDueAt(raw: string | null | undefined): Date | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Build ISO datetime from HTML date + optional time in the user's local timezone.
 * Empty date returns null. Time omitted uses local midnight for that calendar day.
 */
export function buildDueAtIsoFromDateAndTimeLocal(
  dateStr: string,
  timeStr: string
): string | null {
  const date = dateStr.trim();
  if (!date) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const da = Number(m[3]);
  const t = timeStr.trim();
  let h = 0;
  let min = 0;
  if (t) {
    const tm = /^(\d{1,2}):(\d{2})/.exec(t);
    if (tm) {
      h = Number(tm[1]);
      min = Number(tm[2]);
    }
  }
  const local = new Date(y, mo, da, h, min, 0, 0);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

/** Values for `<input type="date">` and `<input type="time">` from a stored ISO dueAt. */
export function isoToDueFormValues(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { date, time };
}

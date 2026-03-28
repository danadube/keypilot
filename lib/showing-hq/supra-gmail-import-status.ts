/**
 * Shared type + user-facing copy for Supra Gmail import automation (dashboard + inbox).
 */

export type SupraGmailImportStatus = {
  automationEnabled: boolean;
  lastRunAt: string | null;
  lastRunSuccess: boolean | null;
  lastRunImported: number | null;
  lastRunRefreshed: number | null;
  lastRunScanned: number | null;
  lastRunError: string | null;
};

export const defaultSupraGmailImportStatus = (): SupraGmailImportStatus => ({
  automationEnabled: true,
  lastRunAt: null,
  lastRunSuccess: null,
  lastRunImported: null,
  lastRunRefreshed: null,
  lastRunScanned: null,
  lastRunError: null,
});

export function relTimeShort(iso: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const d = Math.floor(hr / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/** Non-technical summary of the last import run (success, counts, or failure). */
export function formatSupraGmailImportResultSummary(
  gmailImport: SupraGmailImportStatus,
  hasGmail: boolean
): string | null {
  if (!gmailImport.lastRunAt) {
    return hasGmail ? "No import run yet on this account." : null;
  }
  if (gmailImport.lastRunSuccess === false) {
    return gmailImport.lastRunError
      ? `Last run failed — ${gmailImport.lastRunError.slice(0, 120)}${gmailImport.lastRunError.length > 120 ? "…" : ""}`
      : "Last run failed.";
  }
  const n = gmailImport.lastRunImported ?? 0;
  const r = gmailImport.lastRunRefreshed ?? 0;
  if (n > 0 && r > 0) {
    return `Last run imported ${n} message${n === 1 ? "" : "s"} and refreshed ${r}.`;
  }
  if (n > 0) {
    return `Last run imported ${n} message${n === 1 ? "" : "s"}.`;
  }
  if (r > 0) {
    return `Last run refreshed ${r} message${r === 1 ? "" : "s"}.`;
  }
  const scanned = gmailImport.lastRunScanned ?? 0;
  return scanned > 0
    ? "Last run found nothing new to add (messages may already be in your queue)."
    : "Last run finished — nothing new to import.";
}

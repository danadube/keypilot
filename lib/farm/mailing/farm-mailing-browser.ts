import { buildMailingListCsv } from "@/lib/farm/mailing/mailing-list-csv";
import type { FarmMailingRecipient } from "@/lib/farm/mailing/recipients";

export type FarmMailingScopeQuery =
  | { territoryId: string }
  | { farmAreaId: string };

function scopeToQueryString(scope: FarmMailingScopeQuery): string {
  if ("farmAreaId" in scope) {
    return `farmAreaId=${encodeURIComponent(scope.farmAreaId)}`;
  }
  return `territoryId=${encodeURIComponent(scope.territoryId)}`;
}

export type FarmMailingSummaryPayload = {
  scopeLabel: string;
  summary: {
    contactCount: number;
    labelPages: number;
    labelsPerPage: number;
  };
};

export async function fetchFarmMailingSummary(
  scope: FarmMailingScopeQuery
): Promise<FarmMailingSummaryPayload> {
  const qs = scopeToQueryString(scope);
  const res = await fetch(
    `/api/v1/farm/mailing-recipients?${qs}&format=json&summaryOnly=true`
  );
  const json = (await res.json()) as {
    error?: { message?: string };
    data?: FarmMailingSummaryPayload;
  };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? "Failed to load mailing summary");
  }
  if (!json.data) throw new Error("Invalid mailing response");
  return json.data;
}

export async function downloadFarmMailingCsv(scope: FarmMailingScopeQuery): Promise<void> {
  const qs = scopeToQueryString(scope);
  const res = await fetch(`/api/v1/farm/mailing-recipients?${qs}&format=json`);
  const json = (await res.json()) as {
    error?: { message?: string };
    data?: { recipients: FarmMailingRecipient[] };
  };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? "Export failed");
  }
  const recipients = json.data?.recipients ?? [];
  const csv = buildMailingListCsv(recipients);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `farm-mailing-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function printFarmMailingLabels(
  scope: FarmMailingScopeQuery
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const qs = scopeToQueryString(scope);
  const res = await fetch(`/api/v1/farm/mailing-recipients?${qs}&format=html`);
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    return { ok: false, reason: j?.error?.message ?? "Print failed" };
  }
  const html = await res.text();
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) {
    return { ok: false, reason: "Pop-up blocked — allow pop-ups to print labels." };
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  return { ok: true };
}

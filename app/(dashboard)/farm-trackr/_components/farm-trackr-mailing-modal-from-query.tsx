"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, Printer } from "lucide-react";
import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { buildMailingListCsv } from "@/lib/farm/mailing/mailing-list-csv";

type TerritoryOpt = { id: string; name: string };
type AreaOpt = {
  id: string;
  name: string;
  territory: { id: string; name: string };
};

export function FarmTrackrMailingModalFromQuery() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const open = searchParams.get("mailing") === "open";

  const [mailingScope, setMailingScope] = useState<"territory" | "area">("territory");
  const [mailingTerritoryId, setMailingTerritoryId] = useState("");
  const [mailingAreaId, setMailingAreaId] = useState("");
  const [territories, setTerritories] = useState<TerritoryOpt[]>([]);
  const [areas, setAreas] = useState<AreaOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [mailingBusy, setMailingBusy] = useState<"csv" | "print" | null>(null);
  const [mailingHint, setMailingHint] = useState<string | null>(null);

  const dismiss = useCallback(() => {
    router.replace("/farm-trackr", { scroll: false });
  }, [router]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      fetch("/api/v1/farm-territories?visibility=active").then((r) => r.json()),
      fetch("/api/v1/farm-areas?visibility=active").then((r) => r.json()),
    ])
      .then(([tJson, aJson]) => {
        if (cancelled) return;
        setTerritories((tJson?.data as TerritoryOpt[]) ?? []);
        setAreas((aJson?.data as AreaOpt[]) ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const mailingQuerySuffix =
    mailingScope === "territory"
      ? mailingTerritoryId
        ? `territoryId=${encodeURIComponent(mailingTerritoryId)}`
        : ""
      : mailingAreaId
        ? `farmAreaId=${encodeURIComponent(mailingAreaId)}`
        : "";

  const exportMailingCsv = async () => {
    if (!mailingQuerySuffix) {
      setMailingHint("Choose a territory or farm area first.");
      return;
    }
    setMailingBusy("csv");
    setMailingHint(null);
    try {
      const res = await fetch(`/api/v1/farm/mailing-recipients?${mailingQuerySuffix}&format=json`);
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Export failed");
      const recipients = json.data?.recipients ?? [];
      const summary = json.data?.summary;
      const csv = buildMailingListCsv(recipients);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `farm-mailing-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      const n = summary?.contactCount ?? recipients.length;
      const p = summary?.labelPages ?? 0;
      setMailingHint(
        `${n} contact${n === 1 ? "" : "s"} · ${p} label page${p === 1 ? "" : "s"} (Avery 5160)`
      );
    } catch (e) {
      setMailingHint(e instanceof Error ? e.message : "Export failed");
    } finally {
      setMailingBusy(null);
    }
  };

  const printMailingLabels = async () => {
    if (!mailingQuerySuffix) {
      setMailingHint("Choose a territory or farm area first.");
      return;
    }
    setMailingBusy("print");
    setMailingHint(null);
    try {
      const res = await fetch(`/api/v1/farm/mailing-recipients?${mailingQuerySuffix}&format=html`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error?.message ?? "Could not build label sheet");
      }
      const html = await res.text();
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (!w) {
        setMailingHint("Pop-up blocked — allow pop-ups to print labels.");
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      setMailingHint("Use the preview window → File → Print (Avery 5160, no margin scaling).");
    } catch (e) {
      setMailingHint(e instanceof Error ? e.message : "Print failed");
    } finally {
      setMailingBusy(null);
    }
  };

  return (
    <BrandModal
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
      title="Mailing list & labels"
      description="Export CSV for mail merge or print Avery 5160 labels (deduped memberships with full mailing address)."
      size="md"
      bodyClassName="max-h-[min(80vh,560px)] overflow-y-auto py-3"
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-kp-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-3">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal/90" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-xs text-kp-on-surface">
                <input
                  type="radio"
                  name="mailing-scope-modal"
                  checked={mailingScope === "territory"}
                  onChange={() => {
                    setMailingScope("territory");
                    setMailingAreaId("");
                  }}
                  className="h-3.5 w-3.5 border-kp-outline text-kp-teal"
                />
                Entire territory
              </label>
              <label className="flex items-center gap-2 text-xs text-kp-on-surface">
                <input
                  type="radio"
                  name="mailing-scope-modal"
                  checked={mailingScope === "area"}
                  onChange={() => {
                    setMailingScope("area");
                    setMailingTerritoryId("");
                  }}
                  className="h-3.5 w-3.5 border-kp-outline text-kp-teal"
                />
                Single farm area
              </label>
            </div>
            {mailingScope === "territory" ? (
              <select
                value={mailingTerritoryId}
                onChange={(e) => setMailingTerritoryId(e.target.value)}
                disabled={territories.length === 0}
                className="h-9 w-full max-w-md rounded-md border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface"
              >
                <option value="">Select territory…</option>
                {territories.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={mailingAreaId}
                onChange={(e) => setMailingAreaId(e.target.value)}
                disabled={areas.length === 0}
                className="h-9 w-full max-w-md rounded-md border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface"
              >
                <option value="">Select farm area…</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.territory.name} — {a.name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className={cn(kpBtnSecondary, "h-8 border-transparent px-3 text-xs")}
                disabled={!!mailingBusy}
                onClick={() => void exportMailingCsv()}
              >
                {mailingBusy === "csv" ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : null}
                Export CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn(kpBtnSecondary, "h-8 border-transparent px-3 text-xs")}
                disabled={!!mailingBusy}
                onClick={() => void printMailingLabels()}
              >
                {mailingBusy === "print" ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                )}
                Print labels
              </Button>
            </div>
            {mailingHint ? (
              <p className="text-xs text-kp-on-surface-variant">{mailingHint}</p>
            ) : null}
          </div>
        </div>
      )}
    </BrandModal>
  );
}

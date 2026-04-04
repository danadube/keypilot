"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, Printer } from "lucide-react";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { Button } from "@/components/ui/button";
import {
  kpBtnPrimary,
  kpBtnSecondary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { cn } from "@/lib/utils";
import { useFarmTrackrStructure } from "@/components/modules/farm-trackr/use-farm-trackr-structure";
import {
  downloadFarmMailingCsv,
  fetchFarmMailingSummary,
  printFarmMailingLabels,
  type FarmMailingScopeQuery,
} from "@/lib/farm/mailing/farm-mailing-browser";

function scopeOpKey(kind: "csv" | "print", scope: FarmMailingScopeQuery): string {
  const sk =
    "farmAreaId" in scope ? `a:${scope.farmAreaId}` : `t:${scope.territoryId}`;
  return `${kind}:${sk}`;
}

export function FarmTrackrListsView() {
  const { territories, areas, loading, error } = useFarmTrackrStructure();
  const [mailTerritory, setMailTerritory] = useState<Record<string, number>>({});
  const [mailArea, setMailArea] = useState<Record<string, number>>({});
  const [mailCountsLoading, setMailCountsLoading] = useState(false);
  const [mailCountsError, setMailCountsError] = useState<string | null>(null);
  const [busyOp, setBusyOp] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    setMailCountsLoading(true);
    setMailCountsError(null);
    void (async () => {
      try {
        const tSettled = await Promise.allSettled(
          territories.map(async (t) => {
            const d = await fetchFarmMailingSummary({ territoryId: t.id });
            return { id: t.id, count: d.summary.contactCount };
          })
        );
        const aSettled = await Promise.allSettled(
          areas.map(async (a) => {
            const d = await fetchFarmMailingSummary({ farmAreaId: a.id });
            return { id: a.id, count: d.summary.contactCount };
          })
        );
        if (cancelled) return;
        const nextT: Record<string, number> = {};
        for (const r of tSettled) {
          if (r.status === "fulfilled") nextT[r.value.id] = r.value.count;
        }
        const nextA: Record<string, number> = {};
        for (const r of aSettled) {
          if (r.status === "fulfilled") nextA[r.value.id] = r.value.count;
        }
        setMailTerritory(nextT);
        setMailArea(nextA);
        if (tSettled.some((r) => r.status === "rejected") || aSettled.some((r) => r.status === "rejected")) {
          setMailCountsError("Some mailing counts could not be loaded.");
        }
      } catch (e) {
        if (!cancelled) {
          setMailCountsError(e instanceof Error ? e.message : "Failed to load mailing counts");
        }
      } finally {
        if (!cancelled) setMailCountsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, territories, areas]);

  const runCsv = useCallback(async (scope: FarmMailingScopeQuery) => {
    const key = scopeOpKey("csv", scope);
    setBusyOp(key);
    setHint(null);
    try {
      await downloadFarmMailingCsv(scope);
      setHint("CSV downloaded.");
    } catch (e) {
      setHint(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusyOp(null);
    }
  }, []);

  const runPrint = useCallback(async (scope: FarmMailingScopeQuery) => {
    const key = scopeOpKey("print", scope);
    setBusyOp(key);
    setHint(null);
    try {
      const r = await printFarmMailingLabels(scope);
      if (!r.ok) setHint(r.reason);
      else setHint("Use the preview window → File → Print (Avery 5160, no margin scaling).");
    } catch (e) {
      setHint(e instanceof Error ? e.message : "Print failed");
    } finally {
      setBusyOp(null);
    }
  }, []);

  return (
    <ModuleGate
      moduleId="farm-trackr"
      moduleName="FarmTrackr"
      valueProposition="Geographic farming intelligence and territory management for prospecting in your farm areas."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="max-w-2xl text-xs text-kp-on-surface-variant">
            Exports and print use active memberships with a complete mailing address on the contact
            (deduped per scope). Saved segments and CRM lists are not implemented here yet.
          </p>
          <Link
            href="/farm-trackr"
            className="text-xs font-medium text-kp-teal underline-offset-2 hover:underline"
          >
            Overview — import tool
          </Link>
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}
        {mailCountsError ? (
          <p className="text-xs text-amber-200/90">{mailCountsError}</p>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-kp-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            <section className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
              <div className="border-b border-kp-outline bg-kp-surface-high/40 px-4 py-3">
                <h2 className="text-sm font-semibold text-kp-on-surface">By territory</h2>
                <p className="mt-0.5 text-xs text-kp-on-surface-variant">
                  Full territory scope (all areas combined, deduped).
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b border-kp-outline text-xs text-kp-on-surface-muted">
                    <tr>
                      <th className="px-4 py-2 font-medium">Territory</th>
                      <th className="px-4 py-2 font-medium">Mail-ready</th>
                      <th className="px-4 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-kp-outline text-kp-on-surface">
                    {territories.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-xs text-kp-on-surface-variant">
                          No territories.{" "}
                          <Link href="/farm-trackr" className="font-medium text-kp-teal hover:underline">
                            Create on Overview
                          </Link>
                          .
                        </td>
                      </tr>
                    ) : (
                      territories.map((t) => {
                        const scope = { territoryId: t.id } as const;
                        const countLabel =
                          mailCountsLoading && mailTerritory[t.id] === undefined ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-kp-on-surface-muted" />
                          ) : (
                            <span>{mailTerritory[t.id] ?? "—"}</span>
                          );
                        return (
                          <tr key={t.id}>
                            <td className="px-4 py-2.5 font-medium">{t.name}</td>
                            <td className="px-4 py-2.5 text-kp-on-surface-variant">{countLabel}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className={cn(kpBtnSecondary, "h-8 border-transparent px-2.5 text-xs")}
                                  disabled={!!busyOp}
                                  onClick={() => void runCsv(scope)}
                                >
                                  {busyOp === scopeOpKey("csv", scope) ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : null}
                                  CSV
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className={cn(kpBtnSecondary, "h-8 border-transparent px-2.5 text-xs")}
                                  disabled={!!busyOp}
                                  onClick={() => void runPrint(scope)}
                                >
                                  {busyOp === scopeOpKey("print", scope) ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : (
                                    <Printer className="mr-1 h-3 w-3" />
                                  )}
                                  Labels
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
              <div className="border-b border-kp-outline bg-kp-surface-high/40 px-4 py-3">
                <h2 className="text-sm font-semibold text-kp-on-surface">By farm area</h2>
                <p className="mt-0.5 text-xs text-kp-on-surface-variant">
                  Scoped to one area; members column is all active assignments (any address).
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-kp-outline text-xs text-kp-on-surface-muted">
                    <tr>
                      <th className="px-4 py-2 font-medium">Territory</th>
                      <th className="px-4 py-2 font-medium">Area</th>
                      <th className="px-4 py-2 font-medium">Members</th>
                      <th className="px-4 py-2 font-medium">Mail-ready</th>
                      <th className="px-4 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-kp-outline text-kp-on-surface">
                    {areas.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-xs text-kp-on-surface-variant">
                          No farm areas.{" "}
                          <Link href="/farm-trackr" className="font-medium text-kp-teal hover:underline">
                            Add on Overview
                          </Link>
                          .
                        </td>
                      </tr>
                    ) : (
                      areas.map((a) => {
                        const scope = { farmAreaId: a.id } as const;
                        const countLabel =
                          mailCountsLoading && mailArea[a.id] === undefined ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-kp-on-surface-muted" />
                          ) : (
                            <span>{mailArea[a.id] ?? "—"}</span>
                          );
                        return (
                          <tr key={a.id}>
                            <td className="px-4 py-2.5 text-kp-on-surface-variant">
                              {a.territory.name}
                            </td>
                            <td className="px-4 py-2.5 font-medium">{a.name}</td>
                            <td className="px-4 py-2.5 text-kp-on-surface-variant">
                              {a.membershipCount}
                            </td>
                            <td className="px-4 py-2.5 text-kp-on-surface-variant">{countLabel}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className={cn(kpBtnSecondary, "h-8 border-transparent px-2.5 text-xs")}
                                  disabled={!!busyOp}
                                  onClick={() => void runCsv(scope)}
                                >
                                  {busyOp === scopeOpKey("csv", scope) ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : null}
                                  CSV
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className={cn(kpBtnSecondary, "h-8 border-transparent px-2.5 text-xs")}
                                  disabled={!!busyOp}
                                  onClick={() => void runPrint(scope)}
                                >
                                  {busyOp === scopeOpKey("print", scope) ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : (
                                    <Printer className="mr-1 h-3 w-3" />
                                  )}
                                  Labels
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className={cn(kpBtnPrimary, "h-9 text-xs")}
                asChild
              >
                <Link href="/contacts">Open contacts</Link>
              </Button>
            </div>

            {hint ? (
              <p className="text-xs text-kp-on-surface-variant">{hint}</p>
            ) : null}
          </>
        )}
      </div>
    </ModuleGate>
  );
}

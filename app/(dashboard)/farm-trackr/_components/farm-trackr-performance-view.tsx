"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { useFarmTrackrStructure } from "@/components/modules/farm-trackr/use-farm-trackr-structure";
import { fetchFarmMailingSummary } from "@/lib/farm/mailing/farm-mailing-browser";
import { UI_COPY } from "@/lib/ui-copy";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-kp-outline bg-kp-surface px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wider text-kp-on-surface-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-kp-on-surface">{value}</p>
      {sub ? <p className="mt-1 text-xs text-kp-on-surface-variant">{sub}</p> : null}
    </div>
  );
}

export function FarmTrackrPerformanceView() {
  const { territories, areas, loading, error, areasByTerritoryId } = useFarmTrackrStructure();
  const [mailTerritory, setMailTerritory] = useState<Record<string, number>>({});
  const [mailLoading, setMailLoading] = useState(false);
  const [mailError, setMailError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const territoryCount = territories.length;
    const areaCount = areas.length;
    const assignments = areas.reduce((s, a) => s + a.membershipCount, 0);
    const activeFarms = areas.filter((a) => a.membershipCount > 0).length;
    const emptyFarms = areas.filter((a) => a.membershipCount === 0).length;
    return { territoryCount, areaCount, assignments, activeFarms, emptyFarms };
  }, [territories, areas]);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    setMailLoading(true);
    setMailError(null);
    void (async () => {
      try {
        const settled = await Promise.allSettled(
          territories.map(async (t) => {
            const d = await fetchFarmMailingSummary({ territoryId: t.id });
            return { id: t.id, count: d.summary.contactCount };
          })
        );
        if (cancelled) return;
        const next: Record<string, number> = {};
        for (const r of settled) {
          if (r.status === "fulfilled") next[r.value.id] = r.value.count;
        }
        setMailTerritory(next);
        if (settled.some((r) => r.status === "rejected")) {
          setMailError("Some mailing-ready totals could not be loaded.");
        }
      } catch (e) {
        if (!cancelled) {
          setMailError(e instanceof Error ? e.message : "Failed to load mailing summaries");
        }
      } finally {
        if (!cancelled) setMailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, territories]);

  const mailingReadySum = useMemo(
    () => Object.values(mailTerritory).reduce((s, n) => s + n, 0),
    [mailTerritory]
  );

  return (
    <ModuleGate
      moduleId="farm-trackr"
      moduleName="FarmTrackr"
      valueProposition="Geographic farming intelligence and territory management for prospecting in your farm areas."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-4">
        <p className="max-w-2xl text-xs text-kp-on-surface-variant">
          {UI_COPY.farmTrackr.performanceBlurb}
        </p>

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}
        {mailError ? <p className="text-xs text-amber-200/90">{mailError}</p> : null}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-kp-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" />
            {UI_COPY.farmTrackr.loadingLists}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Territories" value={totals.territoryCount} />
              <StatCard label="Farm areas" value={totals.areaCount} />
              <StatCard
                label="Active farms"
                value={totals.activeFarms}
                sub="Areas with at least one active membership."
              />
              <StatCard
                label="Empty farms"
                value={totals.emptyFarms}
                sub="Areas with zero members."
              />
              <StatCard
                label="Total members"
                value={totals.assignments}
                sub={UI_COPY.farmTrackr.totalMembersNote}
              />
              <StatCard
                label="Mailing-ready"
                value={
                  mailLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-kp-on-surface-muted" />
                  ) : (
                    mailingReadySum
                  )
                }
                sub={UI_COPY.farmTrackr.mailingReadySumNote}
              />
            </div>

            <section className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
              <div className="border-b border-kp-outline bg-kp-surface-high/40 px-4 py-3">
                <h2 className="text-sm font-semibold text-kp-on-surface">By territory</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-kp-outline text-xs text-kp-on-surface-muted">
                    <tr>
                      <th className="px-4 py-2 font-medium">Territory</th>
                      <th className="px-4 py-2 font-medium">Farm areas</th>
                      <th className="px-4 py-2 font-medium">Assignments</th>
                      <th className="px-4 py-2 font-medium">Mail-ready</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-kp-outline text-kp-on-surface">
                    {territories.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-xs text-kp-on-surface-variant">
                          No territories yet.{" "}
                          <Link href="/farm-trackr" className="font-medium text-kp-teal hover:underline">
                            Create on Overview
                          </Link>
                          .
                        </td>
                      </tr>
                    ) : (
                      territories.map((t) => {
                        const tAreas = areasByTerritoryId.get(t.id) ?? [];
                        const asgn = tAreas.reduce((s, a) => s + a.membershipCount, 0);
                        const mailCell =
                          mailLoading && mailTerritory[t.id] === undefined ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-kp-on-surface-muted" />
                          ) : (
                            <span>{mailTerritory[t.id] ?? "—"}</span>
                          );
                        return (
                          <tr key={t.id}>
                            <td className="px-4 py-2.5 font-medium">{t.name}</td>
                            <td className="px-4 py-2.5 tabular-nums text-kp-on-surface-variant">
                              {tAreas.length}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums text-kp-on-surface-variant">
                              {asgn}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums text-kp-on-surface-variant">
                              {mailCell}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </ModuleGate>
  );
}

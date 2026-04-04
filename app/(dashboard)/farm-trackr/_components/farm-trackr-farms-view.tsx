"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { Button } from "@/components/ui/button";
import { useFarmTrackrStructure } from "@/components/modules/farm-trackr/use-farm-trackr-structure";
import { UI_COPY } from "@/lib/ui-copy";
import { cn } from "@/lib/utils";
import { FarmAreaMembersBulkPanel } from "./farm-area-members-bulk-panel";

export function FarmTrackrFarmsView() {
  const { territories, areas, loading, error, reload, areasByTerritoryId, otherAreaOptions } =
    useFarmTrackrStructure();
  const [expandedMemberAreaId, setExpandedMemberAreaId] = useState<string | null>(null);

  const scrollToMembersPanel = useCallback((areaId: string) => {
    setExpandedMemberAreaId(areaId);
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        document
          .getElementById(`farm-area-members-${areaId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    });
  }, []);

  const totalAssignments = useMemo(
    () => areas.reduce((s, a) => s + a.membershipCount, 0),
    [areas]
  );

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
            Territory and farm area directory. Manage members per area; imports and mailing on Overview.
          </p>
          <div className="flex flex-wrap gap-3 text-xs">
            <Link
              href="/farm-trackr"
              className="font-medium text-kp-teal underline-offset-2 hover:underline"
            >
              Overview — imports &amp; mailing
            </Link>
            <Link
              href="/contacts"
              className="font-medium text-kp-teal underline-offset-2 hover:underline"
            >
              Contacts
            </Link>
          </div>
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-kp-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" />
            {UI_COPY.farmTrackr.loadingFarmStructure}
          </div>
        ) : (
          <>
            <p className="text-xs text-kp-on-surface-muted">
              {territories.length} territor{territories.length === 1 ? "y" : "ies"} · {areas.length}{" "}
              farm {areas.length === 1 ? "area" : "areas"} · {totalAssignments} active membership
              {totalAssignments === 1 ? "" : "s"}
            </p>

            {territories.length === 0 ? (
              <div className="rounded-xl border border-kp-outline bg-kp-surface p-5 text-sm text-kp-on-surface-variant">
                No territories yet.{" "}
                <Link href="/farm-trackr" className="font-medium text-kp-teal hover:underline">
                  Create one on Overview
                </Link>
                .
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {territories.map((t) => {
                  const tAreas = areasByTerritoryId.get(t.id) ?? [];
                  const territoryMembers = tAreas.reduce((s, a) => s + a.membershipCount, 0);
                  return (
                    <section
                      key={t.id}
                      className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-kp-outline bg-kp-surface-high/40 px-4 py-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-sm font-semibold text-kp-on-surface">
                            {t.name}
                          </h2>
                          {t.description ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-kp-on-surface-variant">
                              {t.description}
                            </p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-xs text-kp-on-surface-muted">
                          {tAreas.length} {tAreas.length === 1 ? "area" : "areas"} · {territoryMembers}{" "}
                          member{territoryMembers === 1 ? "" : "s"}
                        </p>
                      </div>
                      {tAreas.length === 0 ? (
                        <p className="px-4 py-4 text-xs text-kp-on-surface-variant">
                          No farm areas in this territory.{" "}
                          <Link
                            href="/farm-trackr"
                            className="font-medium text-kp-teal hover:underline"
                          >
                            Add on Overview
                          </Link>
                          .
                        </p>
                      ) : (
                        <ul className="divide-y divide-kp-outline">
                          {tAreas.map((area) => {
                            const isEmpty = area.membershipCount === 0;
                            return (
                            <li key={area.id} className="px-4 py-3">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-kp-on-surface">{area.name}</p>
                                <span
                                  className={cn(
                                    "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                    isEmpty
                                      ? "border border-kp-outline bg-kp-surface-high/60 text-kp-on-surface-muted"
                                      : "border border-kp-teal/35 bg-kp-teal/10 text-kp-teal"
                                  )}
                                >
                                  {isEmpty
                                    ? UI_COPY.farmTrackr.farmAreaEmpty
                                    : UI_COPY.farmTrackr.farmAreaActive}
                                </span>
                                <span className="text-[10px] text-kp-on-surface-muted">
                                  {UI_COPY.farmTrackr.lastActivityPlaceholder}
                                </span>
                              </div>
                              <p className="text-xs text-kp-on-surface-variant">
                                Members · {area.membershipCount} active
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => scrollToMembersPanel(area.id)}
                                >
                                  {area.membershipCount === 0
                                    ? "+ Add members"
                                    : "Manage members"}
                                </Button>
                                <Button size="sm" variant="outline" asChild>
                                  <Link
                                    href={`/farm-trackr/lists?scope=area&id=${encodeURIComponent(area.id)}`}
                                  >
                                    📬 Create mailing
                                  </Link>
                                </Button>
                                <Button size="sm" variant="ghost" asChild>
                                  <Link
                                    href={`/contacts?farmAreaId=${encodeURIComponent(area.id)}`}
                                  >
                                    🔗 Open contacts
                                  </Link>
                                </Button>
                              </div>
                              <div id={`farm-area-members-${area.id}`} className="scroll-mt-4">
                                <FarmAreaMembersBulkPanel
                                  areaId={area.id}
                                  areaName={area.name}
                                  membershipCountListed={area.membershipCount}
                                  expanded={expandedMemberAreaId === area.id}
                                  onToggle={() =>
                                    setExpandedMemberAreaId((cur) =>
                                      cur === area.id ? null : area.id
                                    )
                                  }
                                  onMembershipsChanged={() => void reload()}
                                  otherAreas={otherAreaOptions.filter((o) => o.id !== area.id)}
                                />
                              </div>
                            </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </ModuleGate>
  );
}

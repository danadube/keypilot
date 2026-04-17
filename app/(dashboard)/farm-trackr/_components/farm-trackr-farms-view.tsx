"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { Button } from "@/components/ui/button";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { useFarmTrackrStructure } from "@/components/modules/farm-trackr/use-farm-trackr-structure";
import { UI_COPY } from "@/lib/ui-copy";
import { cn } from "@/lib/utils";
import { FarmAreaMembersBulkPanel } from "./farm-area-members-bulk-panel";
import { FarmTrackrStructureVisibilityToggle } from "./farm-trackr-structure-visibility";

export function FarmTrackrFarmsView() {
  const {
    structureVisibility,
    setStructureVisibility,
    territories,
    areas,
    loading,
    error,
    reload,
    areasByTerritoryId,
    otherAreaOptions,
  } = useFarmTrackrStructure();
  const [expandedMemberAreaId, setExpandedMemberAreaId] = useState<string | null>(null);
  const [restoreBusy, setRestoreBusy] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

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

  const restoreTerritory = useCallback(
    async (territoryId: string) => {
      setRestoreBusy(`t:${territoryId}`);
      setRestoreError(null);
      try {
        const res = await fetch(`/api/v1/farm-territories/${territoryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restore: true }),
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error?.message ?? "Could not restore territory");
        }
        await reload();
      } catch (e) {
        setRestoreError(e instanceof Error ? e.message : "Could not restore territory");
      } finally {
        setRestoreBusy(null);
      }
    },
    [reload]
  );

  const restoreArea = useCallback(
    async (areaId: string) => {
      setRestoreBusy(`a:${areaId}`);
      setRestoreError(null);
      try {
        const res = await fetch(`/api/v1/farm-areas/${areaId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restore: true }),
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error?.message ?? "Could not restore farm area");
        }
        await reload();
      } catch (e) {
        setRestoreError(e instanceof Error ? e.message : "Could not restore farm area");
      } finally {
        setRestoreBusy(null);
      }
    },
    [reload]
  );

  return (
    <ModuleGate
      moduleId="farm-trackr"
      moduleName="FarmTrackr"
      valueProposition="Geographic farming intelligence and territory management for prospecting in your farm areas."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-kp-on-surface">Farm directory</h2>
          <FarmTrackrStructureVisibilityToggle
            value={structureVisibility}
            onChange={setStructureVisibility}
          />
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        {restoreError ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {restoreError}
            <button
              type="button"
              className="ml-auto text-xs font-medium text-kp-teal underline-offset-2 hover:underline"
              onClick={() => setRestoreError(null)}
            >
              Dismiss
            </button>
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
                {structureVisibility === "archived" ? (
                  "No archived territories."
                ) : (
                  <>
                    No territories yet.{" "}
                    <Link href="/farm-trackr" className="font-medium text-kp-teal hover:underline">
                      Create one on Overview
                    </Link>
                    .
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {territories.map((t) => {
                  const tAreas = areasByTerritoryId.get(t.id) ?? [];
                  const territoryMembers = tAreas.reduce((s, a) => s + a.membershipCount, 0);
                  const tArchived = t.archived;
                  return (
                    <section
                      key={t.id}
                      className={cn(
                        "overflow-hidden rounded-xl border bg-kp-surface",
                        tArchived
                          ? "border-amber-500/25 border-dashed"
                          : "border-kp-outline"
                      )}
                    >
                      <div
                        className={cn(
                          "flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3",
                          tArchived
                            ? "border-amber-500/20 bg-amber-500/[0.06]"
                            : "border-kp-outline bg-kp-surface-high/40"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2
                              className={cn(
                                "truncate text-sm font-semibold",
                                tArchived ? "text-kp-on-surface-muted" : "text-kp-on-surface"
                              )}
                            >
                              {t.name}
                            </h2>
                            {tArchived ? (
                              <span className="rounded-md border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100/90">
                                Archived
                              </span>
                            ) : null}
                          </div>
                          {t.description ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-kp-on-surface-variant">
                              {t.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <p className="text-xs text-kp-on-surface-muted">
                            {tAreas.length} {tAreas.length === 1 ? "area" : "areas"} · {territoryMembers}{" "}
                            member{territoryMembers === 1 ? "" : "s"}
                          </p>
                          {tArchived ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={cn(kpBtnSecondary, "h-7 border-transparent px-2 text-[11px]")}
                              disabled={restoreBusy === `t:${t.id}`}
                              onClick={() => void restoreTerritory(t.id)}
                            >
                              {restoreBusy === `t:${t.id}` ? "Restoring…" : "Restore"}
                            </Button>
                          ) : null}
                        </div>
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
                            const aArchived = area.archived;
                            return (
                            <li
                              key={area.id}
                              className={cn(
                                "px-4 py-3",
                                aArchived && "bg-kp-surface-high/25"
                              )}
                            >
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <p
                                  className={cn(
                                    "text-sm font-medium",
                                    aArchived ? "text-kp-on-surface-muted" : "text-kp-on-surface"
                                  )}
                                >
                                  {area.name}
                                </p>
                                {aArchived ? (
                                  <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100/85">
                                    Archived
                                  </span>
                                ) : (
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
                                )}
                                <span className="text-[10px] text-kp-on-surface-muted">
                                  {UI_COPY.farmTrackr.lastActivityPlaceholder}
                                </span>
                              </div>
                              <p className="text-xs text-kp-on-surface-variant">
                                Members · {area.membershipCount} active
                              </p>
                              <div className="mt-3.5 mb-1 flex flex-wrap gap-2">
                                {aArchived ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className={cn(kpBtnSecondary, "border-transparent")}
                                    disabled={restoreBusy === `a:${area.id}` || tArchived}
                                    title={
                                      tArchived
                                        ? "Restore the territory first"
                                        : undefined
                                    }
                                    onClick={() => void restoreArea(area.id)}
                                  >
                                    {restoreBusy === `a:${area.id}` ? "Restoring…" : "Restore area"}
                                  </Button>
                                ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => scrollToMembersPanel(area.id)}
                                >
                                  {area.membershipCount === 0
                                    ? "+ Add members"
                                    : "Manage members"}
                                </Button>
                                )}
                                {!aArchived ? (
                                  <>
                                <Button size="sm" variant="outline" asChild>
                                  <Link
                                    href={`/farm-trackr/lists?scope=area&id=${encodeURIComponent(area.id)}`}
                                  >
                                    📬 Create mailing
                                  </Link>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={cn(kpBtnSecondary, "border-transparent")}
                                  asChild
                                >
                                  <Link
                                    href={`/contacts/all?farmAreaId=${encodeURIComponent(area.id)}`}
                                  >
                                    🔗 Open contacts
                                  </Link>
                                </Button>
                                  </>
                                ) : null}
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

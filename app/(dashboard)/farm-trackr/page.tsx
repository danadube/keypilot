"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  kpBtnPrimary,
  kpBtnSecondary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { AlertCircle, Loader2, MapPinned } from "lucide-react";
import type { FarmStructureVisibility } from "@/lib/validations/farm-structure-visibility";
import { FarmAreaMembersBulkPanel } from "./_components/farm-area-members-bulk-panel";
import { FarmTrackrCreateModalFromQuery } from "./_components/farm-trackr-create-modal-from-query";
import { FarmTrackrHealthSummaryStrip } from "./_components/farm-trackr-health-summary-strip";
import { FarmTrackrImportModalFromQuery } from "./_components/farm-trackr-import-modal-from-query";
import { FarmTrackrMailingModalFromQuery } from "./_components/farm-trackr-mailing-modal-from-query";
import { FarmTrackrStructureVisibilityToggle } from "./_components/farm-trackr-structure-visibility";
import { UI_COPY } from "@/lib/ui-copy";

type Territory = {
  id: string;
  name: string;
  description: string | null;
  areaCount: number;
  archived: boolean;
};

type FarmArea = {
  id: string;
  name: string;
  description: string | null;
  territoryId: string;
  territory: { id: string; name: string };
  membershipCount: number;
  archived: boolean;
};

export default function FarmTrackrPage() {
  const [structureVisibility, setStructureVisibility] =
    useState<FarmStructureVisibility>("active");
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [areas, setAreas] = useState<FarmArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busyTerritoryId, setBusyTerritoryId] = useState<string | null>(null);
  const [busyAreaId, setBusyAreaId] = useState<string | null>(null);

  const [editingTerritoryId, setEditingTerritoryId] = useState<string | null>(null);
  const [editingTerritoryName, setEditingTerritoryName] = useState("");
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingAreaName, setEditingAreaName] = useState("");

  const [expandedMemberAreaId, setExpandedMemberAreaId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const v = encodeURIComponent(structureVisibility);
    try {
      const [tRes, aRes] = await Promise.all([
        fetch(`/api/v1/farm-territories?visibility=${v}`),
        fetch(`/api/v1/farm-areas?visibility=${v}`),
      ]);
      const territoryJson = await tRes.json();
      const areaJson = await aRes.json();
      if (territoryJson.error) throw new Error(territoryJson.error.message);
      if (areaJson.error) throw new Error(areaJson.error.message);
      setTerritories(territoryJson.data ?? []);
      setAreas(areaJson.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : UI_COPY.errors.load("farm data"));
    } finally {
      setLoading(false);
    }
  }, [structureVisibility]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const areasByTerritoryId = useMemo(() => {
    const byTerritory = new Map<string, FarmArea[]>();
    for (const area of areas) {
      byTerritory.set(area.territoryId, [...(byTerritory.get(area.territoryId) ?? []), area]);
    }
    return byTerritory;
  }, [areas]);

  const saveTerritoryName = async (territoryId: string) => {
    if (!editingTerritoryName.trim() || busyTerritoryId) return;
    setBusyTerritoryId(territoryId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/farm-territories/${territoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingTerritoryName.trim() }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to update territory");
      setTerritories((prev) => prev.map((t) => (t.id === territoryId ? json.data : t)));
      setEditingTerritoryId(null);
      setEditingTerritoryName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update territory");
    } finally {
      setBusyTerritoryId(null);
    }
  };

  const archiveTerritory = async (territoryId: string) => {
    if (!confirm("Archive this territory and its areas?")) return;
    setBusyTerritoryId(territoryId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/farm-territories/${territoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: true }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to archive territory");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive territory");
    } finally {
      setBusyTerritoryId(null);
    }
  };

  const restoreTerritory = async (territoryId: string) => {
    setBusyTerritoryId(territoryId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/farm-territories/${territoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to restore territory");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore territory");
    } finally {
      setBusyTerritoryId(null);
    }
  };

  const saveAreaName = async (areaId: string) => {
    if (!editingAreaName.trim() || busyAreaId) return;
    setBusyAreaId(areaId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/farm-areas/${areaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingAreaName.trim() }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to update farm area");
      setAreas((prev) => prev.map((a) => (a.id === areaId ? json.data : a)));
      setEditingAreaId(null);
      setEditingAreaName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update farm area");
    } finally {
      setBusyAreaId(null);
    }
  };

  const archiveArea = async (areaId: string) => {
    if (!confirm("Archive this farm area?")) return;
    setBusyAreaId(areaId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/farm-areas/${areaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: true }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to archive farm area");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive farm area");
    } finally {
      setBusyAreaId(null);
    }
  };

  const restoreArea = async (areaId: string) => {
    setBusyAreaId(areaId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/farm-areas/${areaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to restore farm area");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore farm area");
    } finally {
      setBusyAreaId(null);
    }
  };

  const deleteTerritory = async (territoryId: string) => {
    if (
      !confirm(
        "Permanently delete this territory? This removes the territory, all farm areas in it, and all farm memberships for those areas. Contacts are not deleted—only farm structure and associations."
      )
    ) {
      return;
    }
    setBusyTerritoryId(territoryId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/farm-territories/${territoryId}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok || json.error) {
        throw new Error(json.error?.message ?? "Failed to delete territory");
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete territory");
    } finally {
      setBusyTerritoryId(null);
    }
  };

  const deleteArea = async (areaId: string) => {
    if (
      !confirm(
        "Permanently delete this farm area? This removes the area and all memberships in it. Contacts are not deleted—only farm associations."
      )
    ) {
      return;
    }
    setBusyAreaId(areaId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/farm-areas/${areaId}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok || json.error) {
        throw new Error(json.error?.message ?? "Failed to delete farm area");
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete farm area");
    } finally {
      setBusyAreaId(null);
    }
  };

  return (
    <ModuleGate
      moduleId="farm-trackr"
      moduleName="FarmTrackr"
      valueProposition="Geographic farming intelligence and territory management for prospecting in your farm areas."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-5">
        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        <FarmTrackrHealthSummaryStrip visibility={structureVisibility} />

        <section id="farm-trackr-structure" className="scroll-mt-6 space-y-4 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-kp-on-surface">Territories &amp; farm areas</h2>
            <FarmTrackrStructureVisibilityToggle
              value={structureVisibility}
              onChange={setStructureVisibility}
            />
          </div>

          <div className="space-y-4 pb-2">
          {loading ? (
            <div className="flex items-center gap-2 rounded-xl border border-kp-outline bg-kp-surface px-4 py-3 text-sm text-kp-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading territories and farm areas...
            </div>
          ) : territories.length === 0 ? (
            <div className="rounded-xl border border-kp-outline bg-kp-surface p-5 text-sm text-kp-on-surface-variant">
              {structureVisibility === "archived"
                ? "No archived territories."
                : structureVisibility === "all"
                  ? "No territories yet."
                  : "Use Add → New territory to create your first territory, then add farm areas."}
            </div>
          ) : (
            territories.map((territory) => {
              const territoryAreas = areasByTerritoryId.get(territory.id) ?? [];
              const editingTerritory = editingTerritoryId === territory.id;
              const tArchived = territory.archived;
              return (
                <div
                  key={territory.id}
                  className={cn(
                    "rounded-xl border p-4",
                    tArchived
                      ? "border-amber-500/25 border-dashed bg-kp-surface-high/20"
                      : "border-kp-outline bg-kp-surface"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      {editingTerritory ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingTerritoryName}
                            onChange={(e) => setEditingTerritoryName(e.target.value)}
                            className="h-8 w-[260px] border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface"
                          />
                          <Button
                            type="button"
                            className={cn(kpBtnPrimary, "h-8 border-transparent px-2 text-xs")}
                            onClick={() => void saveTerritoryName(territory.id)}
                            disabled={!editingTerritoryName.trim() || busyTerritoryId === territory.id}
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={cn(
                              "text-sm font-semibold",
                              tArchived ? "text-kp-on-surface-muted" : "text-kp-on-surface"
                            )}
                          >
                            {territory.name}
                          </p>
                          {tArchived ? (
                            <span className="rounded-md border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100/90">
                              Archived
                            </span>
                          ) : null}
                        </div>
                      )}
                      <p className="mt-0.5 text-xs text-kp-on-surface-variant">
                        {territory.areaCount} {territory.areaCount === 1 ? "area" : "areas"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!tArchived && !editingTerritory ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className={cn(kpBtnSecondary, "h-8 px-2 text-xs")}
                          onClick={() => {
                            setEditingTerritoryId(territory.id);
                            setEditingTerritoryName(territory.name);
                          }}
                        >
                          Edit name
                        </Button>
                      ) : null}
                      {editingTerritory ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className={cn(kpBtnSecondary, "h-8 px-2 text-xs")}
                          onClick={() => {
                            setEditingTerritoryId(null);
                            setEditingTerritoryName("");
                          }}
                        >
                          Cancel
                        </Button>
                      ) : null}
                      {tArchived ? (
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(kpBtnSecondary, "h-8 border-transparent px-2 text-xs")}
                          onClick={() => void restoreTerritory(territory.id)}
                          disabled={busyTerritoryId === territory.id}
                        >
                          {busyTerritoryId === territory.id ? "Restoring…" : "Restore"}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          className={cn(kpBtnSecondary, "h-8 px-2 text-xs text-red-300 hover:text-red-300")}
                          onClick={() => void archiveTerritory(territory.id)}
                          disabled={busyTerritoryId === territory.id}
                        >
                          Archive
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        className="h-8 px-2 text-xs"
                        onClick={() => void deleteTerritory(territory.id)}
                        disabled={busyTerritoryId === territory.id}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-kp-outline bg-kp-surface-high">
                    {territoryAreas.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-kp-on-surface-variant">
                        {tArchived
                          ? "No archived areas in this territory."
                          : "No farm areas in this view yet."}
                      </div>
                    ) : (
                      territoryAreas.map((area, idx) => {
                        const editingArea = editingAreaId === area.id;
                        const aArchived = area.archived;
                        return (
                          <div
                            key={area.id}
                            className={cn(
                              "px-3 py-2",
                              idx > 0 && "border-t border-kp-outline",
                              aArchived && "bg-kp-surface/60"
                            )}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                {editingArea ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={editingAreaName}
                                      onChange={(e) => setEditingAreaName(e.target.value)}
                                      className="h-8 w-[240px] border-kp-outline bg-kp-surface text-sm text-kp-on-surface"
                                    />
                                    <Button
                                      type="button"
                                      className={cn(kpBtnPrimary, "h-8 border-transparent px-2 text-xs")}
                                      onClick={() => void saveAreaName(area.id)}
                                      disabled={!editingAreaName.trim() || busyAreaId === area.id}
                                    >
                                      Save
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p
                                      className={cn(
                                        "text-sm",
                                        aArchived ? "text-kp-on-surface-muted" : "text-kp-on-surface"
                                      )}
                                    >
                                      {area.name}
                                    </p>
                                    {aArchived ? (
                                      <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-100/85">
                                        Archived
                                      </span>
                                    ) : null}
                                  </div>
                                )}
                                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-kp-on-surface-variant">
                                  <MapPinned className="h-3 w-3" />
                                  {area.membershipCount} active{" "}
                                  {area.membershipCount === 1 ? "membership" : "memberships"}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {!aArchived && !tArchived && !editingArea ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className={cn(kpBtnSecondary, "h-8 px-2 text-xs")}
                                    onClick={() => {
                                      setEditingAreaId(area.id);
                                      setEditingAreaName(area.name);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                ) : null}
                                {editingArea ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className={cn(kpBtnSecondary, "h-8 px-2 text-xs")}
                                    onClick={() => {
                                      setEditingAreaId(null);
                                      setEditingAreaName("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                ) : null}
                                {aArchived && !tArchived ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className={cn(kpBtnSecondary, "h-8 border-transparent px-2 text-xs")}
                                    onClick={() => void restoreArea(area.id)}
                                    disabled={busyAreaId === area.id}
                                  >
                                    {busyAreaId === area.id ? "Restoring…" : "Restore"}
                                  </Button>
                                ) : !aArchived && !tArchived ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className={cn(
                                      kpBtnSecondary,
                                      "h-8 px-2 text-xs text-red-300 hover:text-red-300"
                                    )}
                                    onClick={() => void archiveArea(area.id)}
                                    disabled={busyAreaId === area.id}
                                  >
                                    Archive
                                  </Button>
                                ) : null}
                                <Button
                                  type="button"
                                  variant="destructive"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => void deleteArea(area.id)}
                                  disabled={busyAreaId === area.id}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
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
                              onMembershipsChanged={() => void loadData()}
                              otherAreas={areas
                                .filter((a) => a.id !== area.id)
                                .map((a) => ({
                                  id: a.id,
                                  name: a.name,
                                  territoryName: a.territory.name,
                                }))}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        </section>

        <Suspense fallback={null}>
          <FarmTrackrImportModalFromQuery onApplySuccess={() => void loadData()} />
        </Suspense>
        <Suspense fallback={null}>
          <FarmTrackrCreateModalFromQuery onCreated={() => void loadData()} />
        </Suspense>
        <Suspense fallback={null}>
          <FarmTrackrMailingModalFromQuery />
        </Suspense>
      </div>
    </ModuleGate>
  );
}

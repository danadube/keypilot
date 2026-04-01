"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  kpBtnPrimary,
  kpBtnSecondary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { AlertCircle, Loader2, MapPinned } from "lucide-react";

type Territory = {
  id: string;
  name: string;
  description: string | null;
  areaCount: number;
};

type FarmArea = {
  id: string;
  name: string;
  description: string | null;
  territoryId: string;
  territory: { id: string; name: string };
  membershipCount: number;
};

export default function FarmTrackrPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [areas, setAreas] = useState<FarmArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTerritoryName, setNewTerritoryName] = useState("");
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaTerritoryId, setNewAreaTerritoryId] = useState("");

  const [busyTerritoryId, setBusyTerritoryId] = useState<string | null>(null);
  const [busyAreaId, setBusyAreaId] = useState<string | null>(null);
  const [creatingTerritory, setCreatingTerritory] = useState(false);
  const [creatingArea, setCreatingArea] = useState(false);

  const [editingTerritoryId, setEditingTerritoryId] = useState<string | null>(null);
  const [editingTerritoryName, setEditingTerritoryName] = useState("");
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingAreaName, setEditingAreaName] = useState("");

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetch("/api/v1/farm-territories"), fetch("/api/v1/farm-areas")])
      .then(async ([territoryRes, areaRes]) => {
        const territoryJson = await territoryRes.json();
        const areaJson = await areaRes.json();
        if (territoryJson.error) throw new Error(territoryJson.error.message);
        if (areaJson.error) throw new Error(areaJson.error.message);
        setTerritories(territoryJson.data ?? []);
        setAreas(areaJson.data ?? []);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load farm management")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const areasByTerritoryId = useMemo(() => {
    const byTerritory = new Map<string, FarmArea[]>();
    for (const area of areas) {
      byTerritory.set(area.territoryId, [...(byTerritory.get(area.territoryId) ?? []), area]);
    }
    return byTerritory;
  }, [areas]);

  const handleCreateTerritory = async () => {
    if (!newTerritoryName.trim() || creatingTerritory) return;
    setCreatingTerritory(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/farm-territories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTerritoryName.trim() }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to create territory");
      setTerritories((prev) => [...prev, json.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTerritoryName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create territory");
    } finally {
      setCreatingTerritory(false);
    }
  };

  const handleCreateArea = async () => {
    if (!newAreaName.trim() || !newAreaTerritoryId || creatingArea) return;
    setCreatingArea(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/farm-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          territoryId: newAreaTerritoryId,
          name: newAreaName.trim(),
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to create farm area");
      setAreas((prev) =>
        [...prev, json.data].sort((a, b) =>
          `${a.territory.name} ${a.name}`.localeCompare(`${b.territory.name} ${b.name}`)
        )
      );
      setTerritories((prev) =>
        prev.map((territory) =>
          territory.id === newAreaTerritoryId
            ? { ...territory, areaCount: territory.areaCount + 1 }
            : territory
        )
      );
      setNewAreaName("");
      setNewAreaTerritoryId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create farm area");
    } finally {
      setCreatingArea(false);
    }
  };

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
      setTerritories((prev) => prev.filter((t) => t.id !== territoryId));
      setAreas((prev) => prev.filter((a) => a.territoryId !== territoryId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive territory");
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
    const area = areas.find((entry) => entry.id === areaId);
    if (!area) return;
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
      setAreas((prev) => prev.filter((entry) => entry.id !== areaId));
      setTerritories((prev) =>
        prev.map((territory) =>
          territory.id === area.territoryId
            ? { ...territory, areaCount: Math.max(0, territory.areaCount - 1) }
            : territory
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive farm area");
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
        <div>
          <h1 className="text-xl font-bold text-kp-on-surface">FarmTrackr</h1>
          <p className="mt-1 text-sm text-kp-on-surface-variant">
            Manage territories and farm areas used by contact memberships.
          </p>
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
            <h2 className="text-sm font-semibold text-kp-on-surface">Create territory</h2>
            <div className="mt-3 flex gap-2">
              <Input
                value={newTerritoryName}
                onChange={(e) => setNewTerritoryName(e.target.value)}
                placeholder="e.g. South Palm Springs"
                className="h-9 border-kp-outline bg-kp-surface-high text-kp-on-surface"
              />
              <Button
                type="button"
                className={cn(kpBtnPrimary, "h-9 border-transparent px-3 text-xs")}
                onClick={() => void handleCreateTerritory()}
                disabled={!newTerritoryName.trim() || creatingTerritory}
              >
                {creatingTerritory ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
            <h2 className="text-sm font-semibold text-kp-on-surface">Create farm area</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <select
                value={newAreaTerritoryId}
                onChange={(e) => setNewAreaTerritoryId(e.target.value)}
                className="h-9 rounded-md border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface"
              >
                <option value="">Select territory</option>
                {territories.map((territory) => (
                  <option key={territory.id} value={territory.id}>
                    {territory.name}
                  </option>
                ))}
              </select>
              <Input
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                placeholder="e.g. Warm Sands"
                className="h-9 border-kp-outline bg-kp-surface-high text-kp-on-surface"
              />
              <Button
                type="button"
                className={cn(kpBtnPrimary, "h-9 border-transparent px-3 text-xs")}
                onClick={() => void handleCreateArea()}
                disabled={!newAreaTerritoryId || !newAreaName.trim() || creatingArea}
              >
                {creatingArea ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 rounded-xl border border-kp-outline bg-kp-surface px-4 py-3 text-sm text-kp-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading territories and farm areas...
            </div>
          ) : territories.length === 0 ? (
            <div className="rounded-xl border border-kp-outline bg-kp-surface p-5 text-sm text-kp-on-surface-variant">
              Create your first territory to start organizing farm areas.
            </div>
          ) : (
            territories.map((territory) => {
              const territoryAreas = areasByTerritoryId.get(territory.id) ?? [];
              const editingTerritory = editingTerritoryId === territory.id;
              return (
                <div
                  key={territory.id}
                  className="rounded-xl border border-kp-outline bg-kp-surface p-4"
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
                        <p className="text-sm font-semibold text-kp-on-surface">{territory.name}</p>
                      )}
                      <p className="mt-0.5 text-xs text-kp-on-surface-variant">
                        {territory.areaCount} {territory.areaCount === 1 ? "area" : "areas"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!editingTerritory ? (
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
                      ) : (
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
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        className={cn(kpBtnSecondary, "h-8 px-2 text-xs text-red-300 hover:text-red-300")}
                        onClick={() => void archiveTerritory(territory.id)}
                        disabled={busyTerritoryId === territory.id}
                      >
                        Archive
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-kp-outline bg-kp-surface-high">
                    {territoryAreas.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-kp-on-surface-variant">
                        No active farm areas yet.
                      </div>
                    ) : (
                      territoryAreas.map((area, idx) => {
                        const editingArea = editingAreaId === area.id;
                        return (
                          <div
                            key={area.id}
                            className={cn(
                              "flex flex-wrap items-center justify-between gap-2 px-3 py-2",
                              idx > 0 && "border-t border-kp-outline"
                            )}
                          >
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
                                <p className="text-sm text-kp-on-surface">{area.name}</p>
                              )}
                              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-kp-on-surface-variant">
                                <MapPinned className="h-3 w-3" />
                                {area.membershipCount} active{" "}
                                {area.membershipCount === 1 ? "membership" : "memberships"}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {!editingArea ? (
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
                              ) : (
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
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                className={cn(kpBtnSecondary, "h-8 px-2 text-xs text-red-300 hover:text-red-300")}
                                onClick={() => void archiveArea(area.id)}
                                disabled={busyAreaId === area.id}
                              >
                                Archive
                              </Button>
                            </div>
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
      </div>
    </ModuleGate>
  );
}

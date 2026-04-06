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
import { AlertCircle, Loader2, Mail, MapPinned, Printer } from "lucide-react";
import type { FarmStructureVisibility } from "@/lib/validations/farm-structure-visibility";
import { buildMailingListCsv } from "@/lib/farm/mailing/mailing-list-csv";
import { FarmAreaMembersBulkPanel } from "./_components/farm-area-members-bulk-panel";
import { FarmTrackrHealthSummaryStrip } from "./_components/farm-trackr-health-summary-strip";
import { FarmTrackrImportWorkflow } from "./_components/farm-trackr-import-workflow";
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
  const [formTerritories, setFormTerritories] = useState<Territory[]>([]);
  const [formAreas, setFormAreas] = useState<FarmArea[]>([]);
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

  const [expandedMemberAreaId, setExpandedMemberAreaId] = useState<string | null>(null);
  const [mailingScope, setMailingScope] = useState<"territory" | "area">("territory");
  const [mailingTerritoryId, setMailingTerritoryId] = useState("");
  const [mailingAreaId, setMailingAreaId] = useState("");
  const [mailingBusy, setMailingBusy] = useState<"csv" | "print" | null>(null);
  const [mailingHint, setMailingHint] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const v = encodeURIComponent(structureVisibility);
    try {
      const [tRes, aRes, tAct, aAct] = await Promise.all([
        fetch(`/api/v1/farm-territories?visibility=${v}`),
        fetch(`/api/v1/farm-areas?visibility=${v}`),
        fetch(`/api/v1/farm-territories?visibility=active`),
        fetch(`/api/v1/farm-areas?visibility=active`),
      ]);
      const territoryJson = await tRes.json();
      const areaJson = await aRes.json();
      const tActiveJson = await tAct.json();
      const aActiveJson = await aAct.json();
      if (territoryJson.error) throw new Error(territoryJson.error.message);
      if (areaJson.error) throw new Error(areaJson.error.message);
      if (tActiveJson.error) throw new Error(tActiveJson.error.message);
      if (aActiveJson.error) throw new Error(aActiveJson.error.message);
      setTerritories(territoryJson.data ?? []);
      setAreas(areaJson.data ?? []);
      setFormTerritories(tActiveJson.data ?? []);
      setFormAreas(aActiveJson.data ?? []);
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
      setNewTerritoryName("");
      await loadData();
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
      setNewAreaName("");
      setNewAreaTerritoryId("");
      await loadData();
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
      setFormTerritories((prev) => prev.map((t) => (t.id === territoryId ? json.data : t)));
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
      setFormAreas((prev) => prev.map((a) => (a.id === areaId ? json.data : a)));
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
      setMailingHint("Use the preview window → File → Print (Avery 5160, no margins scaling).");
    } catch (e) {
      setMailingHint(e instanceof Error ? e.message : "Print failed");
    } finally {
      setMailingBusy(null);
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-2xl text-xs text-kp-on-surface-variant">
            Territories, farm areas, imports, and mailing tools for contact memberships.
          </p>
          <FarmTrackrStructureVisibilityToggle
            value={structureVisibility}
            onChange={setStructureVisibility}
          />
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        <FarmTrackrHealthSummaryStrip visibility={structureVisibility} />

        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <div className="flex flex-wrap items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-kp-on-surface">Mailing list &amp; labels</h2>
              <p className="mt-1 text-xs text-kp-on-surface-variant">
                Active memberships with a full mailing address on the contact (deduped). CSV for mail merge;
                Avery 5160 sheet for browser print.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-xs text-kp-on-surface">
                  <input
                    type="radio"
                    name="mailing-scope"
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
                    name="mailing-scope"
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
                  disabled={loading || formTerritories.length === 0}
                  className="mt-2 h-9 w-full max-w-md rounded-md border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface sm:w-auto"
                >
                  <option value="">Select territory…</option>
                  {formTerritories.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={mailingAreaId}
                  onChange={(e) => setMailingAreaId(e.target.value)}
                  disabled={loading || formAreas.length === 0}
                  className="mt-2 h-9 w-full max-w-md rounded-md border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface sm:w-auto"
                >
                  <option value="">Select farm area…</option>
                  {formAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.territory.name} — {a.name}
                    </option>
                  ))}
                </select>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(kpBtnSecondary, "h-8 border-transparent px-3 text-xs")}
                  disabled={!!mailingBusy || loading}
                  onClick={() => void exportMailingCsv()}
                >
                  {mailingBusy === "csv" ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Export mailing list (CSV)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(kpBtnSecondary, "h-8 border-transparent px-3 text-xs")}
                  disabled={!!mailingBusy || loading}
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
                <p className="mt-2 text-xs text-kp-on-surface-variant">{mailingHint}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <FarmTrackrImportWorkflow onApplySuccess={() => void loadData()} />
        </div>

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
                {formTerritories.map((territory) => (
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
              {structureVisibility === "archived"
                ? "No archived territories."
                : structureVisibility === "all"
                  ? "No territories yet."
                  : "Create your first territory to start organizing farm areas."}
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
      </div>
    </ModuleGate>
  );
}

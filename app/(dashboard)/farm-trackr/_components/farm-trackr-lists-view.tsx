"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, Printer } from "lucide-react";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  kpBtnPrimary,
  kpBtnSecondary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { cn } from "@/lib/utils";
import { UI_COPY } from "@/lib/ui-copy";
import { useFarmTrackrStructure } from "@/components/modules/farm-trackr/use-farm-trackr-structure";
import {
  addSavedListScope,
  deleteSavedListScopeById,
  loadSavedListScopes,
  type SavedListScopeRecord,
} from "@/lib/farm/farmtrackr-saved-list-scopes-storage";
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

function rowDomIdForRecord(rec: SavedListScopeRecord): string | null {
  if (rec.kind === "territory" && rec.territoryId) {
    return `farm-list-scope-t-${rec.territoryId}`;
  }
  if (rec.kind === "farm_area" && rec.farmAreaId) {
    return `farm-list-scope-a-${rec.farmAreaId}`;
  }
  return null;
}

export function FarmTrackrListsView() {
  const { territories, areas, loading, error } = useFarmTrackrStructure();
  const [mailTerritory, setMailTerritory] = useState<Record<string, number>>({});
  const [mailArea, setMailArea] = useState<Record<string, number>>({});
  const [mailCountsLoading, setMailCountsLoading] = useState(false);
  const [mailCountsError, setMailCountsError] = useState<string | null>(null);
  const [busyOp, setBusyOp] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [savedScopes, setSavedScopes] = useState<SavedListScopeRecord[]>([]);
  const [saveKind, setSaveKind] = useState<"territory" | "farm_area">("territory");
  const [saveTerritoryId, setSaveTerritoryId] = useState("");
  const [saveAreaId, setSaveAreaId] = useState("");
  const [saveName, setSaveName] = useState("");
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [highlightRowId, setHighlightRowId] = useState<string | null>(null);

  useEffect(() => {
    setSavedScopes(loadSavedListScopes());
  }, []);

  useEffect(() => {
    if (loading || territories.length === 0) return;
    setSaveTerritoryId((cur) => {
      if (cur && territories.some((t) => t.id === cur)) return cur;
      return territories[0]?.id ?? "";
    });
  }, [loading, territories]);

  useEffect(() => {
    if (loading || areas.length === 0) return;
    setSaveAreaId((cur) => {
      if (cur && areas.some((a) => a.id === cur)) return cur;
      return areas[0]?.id ?? "";
    });
  }, [loading, areas]);

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
        if (
          tSettled.some((r) => r.status === "rejected") ||
          aSettled.some((r) => r.status === "rejected")
        ) {
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

  const applySavedScope = useCallback((rec: SavedListScopeRecord) => {
    const domId = rowDomIdForRecord(rec);
    if (!domId) return;
    setHighlightRowId(domId);
    window.setTimeout(() => {
      document.getElementById(domId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    window.setTimeout(() => setHighlightRowId(null), 2200);
  }, []);

  const handleDeleteScope = useCallback((id: string) => {
    deleteSavedListScopeById(id);
    setSavedScopes(loadSavedListScopes());
  }, []);

  const handleSaveScope = useCallback(() => {
    setSaveHint(null);
    if (saveKind === "territory") {
      const t = territories.find((x) => x.id === saveTerritoryId);
      if (!t) {
        setSaveHint(UI_COPY.errors.generic);
        return;
      }
      const label = `${UI_COPY.farmTrackr.scopeKindTerritory} · ${t.name}`;
      const name =
        saveName.trim() ||
        `${UI_COPY.farmTrackr.scopeKindTerritory}: ${t.name}`.slice(
          0,
          80
        );
      const r = addSavedListScope({
        name,
        kind: "territory",
        territoryId: t.id,
        farmAreaId: null,
        label,
      });
      if (!r.ok) {
        setSaveHint(
          r.reason === "duplicate"
            ? "That scope is already saved."
            : r.reason === "limit"
              ? "Saved scope limit reached."
              : UI_COPY.errors.generic
        );
        return;
      }
    } else {
      const a = areas.find((x) => x.id === saveAreaId);
      if (!a) {
        setSaveHint(UI_COPY.errors.generic);
        return;
      }
      const label = `${UI_COPY.farmTrackr.scopeKindArea} · ${a.name} · ${a.territory.name}`;
      const name =
        saveName.trim() ||
        `${UI_COPY.farmTrackr.scopeKindArea}: ${a.name}`.slice(0, 80);
      const r = addSavedListScope({
        name,
        kind: "farm_area",
        territoryId: null,
        farmAreaId: a.id,
        label,
      });
      if (!r.ok) {
        setSaveHint(
          r.reason === "duplicate"
            ? "That scope is already saved."
            : r.reason === "limit"
              ? "Saved scope limit reached."
              : UI_COPY.errors.generic
        );
        return;
      }
    }
    setSavedScopes(loadSavedListScopes());
    setSaveName("");
  }, [saveKind, saveTerritoryId, saveAreaId, saveName, territories, areas]);

  return (
    <ModuleGate
      moduleId="farm-trackr"
      moduleName="FarmTrackr"
      valueProposition="Geographic farming intelligence and territory management for prospecting in your farm areas."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-4">
        <p className="max-w-2xl text-xs text-kp-on-surface-variant">{UI_COPY.farmTrackr.listsBlurb}</p>

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
            {UI_COPY.farmTrackr.loadingLists}
          </div>
        ) : (
          <>
            <section className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
              <div className="border-b border-kp-outline bg-kp-surface-high/40 px-4 py-3">
                <h2 className="text-sm font-semibold text-kp-on-surface">
                  {UI_COPY.farmTrackr.savedListScopes}
                </h2>
                <p className="mt-0.5 text-xs text-kp-on-surface-variant">
                  {UI_COPY.actions.open} jumps to the row below (this browser only).
                </p>
              </div>
              <div className="space-y-3 px-4 py-3">
                {savedScopes.length === 0 ? (
                  <p className="text-xs text-kp-on-surface-variant">
                    {UI_COPY.empty.noneYet("saved scopes")}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {savedScopes.map((rec) => (
                      <li
                        key={rec.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-kp-outline bg-kp-surface-high/30 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-kp-on-surface">{rec.name}</p>
                          <p className="truncate text-xs text-kp-on-surface-variant">{rec.label}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn(kpBtnSecondary, "h-8 border-transparent px-2.5 text-xs")}
                            onClick={() => applySavedScope(rec)}
                          >
                            {UI_COPY.actions.open}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn(
                              kpBtnSecondary,
                              "h-8 border-transparent px-2.5 text-xs text-red-300 hover:text-red-300"
                            )}
                            onClick={() => handleDeleteScope(rec.id)}
                          >
                            {UI_COPY.actions.delete}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="rounded-lg border border-dashed border-kp-outline-variant bg-kp-surface-high/20 px-3 py-3">
                  <p className="text-xs font-medium text-kp-on-surface">{UI_COPY.farmTrackr.saveScope}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-kp-on-surface">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="save-scope-kind"
                        checked={saveKind === "territory"}
                        onChange={() => setSaveKind("territory")}
                        className="h-3.5 w-3.5 border-kp-outline text-kp-teal"
                      />
                      {UI_COPY.farmTrackr.scopeKindTerritory}
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="save-scope-kind"
                        checked={saveKind === "farm_area"}
                        onChange={() => setSaveKind("farm_area")}
                        className="h-3.5 w-3.5 border-kp-outline text-kp-teal"
                      />
                      {UI_COPY.farmTrackr.scopeKindArea}
                    </label>
                  </div>
                  {saveKind === "territory" ? (
                    <select
                      value={saveTerritoryId}
                      onChange={(e) => setSaveTerritoryId(e.target.value)}
                      disabled={territories.length === 0}
                      className="mt-2 h-9 w-full max-w-md rounded-md border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface sm:w-auto"
                    >
                      {territories.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={saveAreaId}
                      onChange={(e) => setSaveAreaId(e.target.value)}
                      disabled={areas.length === 0}
                      className="mt-2 h-9 w-full max-w-md rounded-md border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface sm:w-auto"
                    >
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.territory.name} — {a.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <Input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Optional label"
                    className="mt-2 h-9 max-w-md border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface"
                  />
                  <Button
                    type="button"
                    className={cn(kpBtnPrimary, "mt-2 h-8 border-transparent px-3 text-xs")}
                    onClick={() => handleSaveScope()}
                    disabled={
                      (saveKind === "territory" && territories.length === 0) ||
                      (saveKind === "farm_area" && areas.length === 0)
                    }
                  >
                    {UI_COPY.actions.save}
                  </Button>
                  {saveHint ? (
                    <p className="mt-2 text-xs text-amber-200/90">{saveHint}</p>
                  ) : null}
                </div>
              </div>
            </section>

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
                        const rowId = `farm-list-scope-t-${t.id}`;
                        const countLabel =
                          mailCountsLoading && mailTerritory[t.id] === undefined ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-kp-on-surface-muted" />
                          ) : (
                            <span>{mailTerritory[t.id] ?? "—"}</span>
                          );
                        return (
                          <tr
                            key={t.id}
                            id={rowId}
                            className={cn(
                              highlightRowId === rowId &&
                                "bg-kp-gold/10 transition-colors duration-300"
                            )}
                          >
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
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={cn(kpBtnSecondary, "h-8 border-transparent px-2.5 text-xs")}
                                  asChild
                                >
                                  <Link
                                    href={`/contacts/all?farmTerritoryId=${encodeURIComponent(t.id)}`}
                                  >
                                    Open contacts
                                  </Link>
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
                        const rowId = `farm-list-scope-a-${a.id}`;
                        const countLabel =
                          mailCountsLoading && mailArea[a.id] === undefined ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-kp-on-surface-muted" />
                          ) : (
                            <span>{mailArea[a.id] ?? "—"}</span>
                          );
                        return (
                          <tr
                            key={a.id}
                            id={rowId}
                            className={cn(
                              highlightRowId === rowId &&
                                "bg-kp-gold/10 transition-colors duration-300"
                            )}
                          >
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
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={cn(kpBtnSecondary, "h-8 border-transparent px-2.5 text-xs")}
                                  asChild
                                >
                                  <Link
                                    href={`/contacts/all?farmAreaId=${encodeURIComponent(a.id)}`}
                                  >
                                    Open contacts
                                  </Link>
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
                <Link href="/contacts/all">All contacts</Link>
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

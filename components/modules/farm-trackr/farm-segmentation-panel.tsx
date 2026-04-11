"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AreaRow = {
  id: string;
  name: string;
  description: string | null;
};

type TerritoryRow = {
  id: string;
  name: string;
  description: string | null;
  areas: AreaRow[];
};

function errorMessage(json: unknown, fallback: string): string {
  if (
    json &&
    typeof json === "object" &&
    "error" in json &&
    json.error &&
    typeof (json as { error: { message?: string } }).error === "object"
  ) {
    const m = (json as { error: { message?: string } }).error.message;
    if (typeof m === "string" && m.length > 0) return m;
  }
  return fallback;
}

type ApiTerritory = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
};

type ApiArea = {
  id: string;
  name: string;
  description: string | null;
  territoryId: string;
};

function mergeTerritoriesWithAreas(
  territories: ApiTerritory[],
  areas: ApiArea[]
): TerritoryRow[] {
  const byTerritoryId = new Map<string, AreaRow[]>();
  for (const a of areas) {
    const list = byTerritoryId.get(a.territoryId) ?? [];
    list.push({
      id: a.id,
      name: a.name,
      description: a.description,
    });
    byTerritoryId.set(a.territoryId, list);
  }
  return territories.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    areas: byTerritoryId.get(t.id) ?? [],
  }));
}

export function FarmSegmentationPanel() {
  const [territories, setTerritories] = useState<TerritoryRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [newTerritoryName, setNewTerritoryName] = useState("");
  const [newAreaByTerritory, setNewAreaByTerritory] = useState<Record<string, string>>(
    {}
  );
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setListError(null);
    const [terrRes, areaRes] = await Promise.all([
      fetch("/api/v1/farm-territories"),
      fetch("/api/v1/farm-areas"),
    ]);
    const terrJson = await terrRes.json().catch(() => null);
    const areaJson = await areaRes.json().catch(() => null);
    if (!terrRes.ok) {
      setListError(errorMessage(terrJson, "Could not load territories"));
      setTerritories([]);
      return;
    }
    if (!areaRes.ok) {
      setListError(errorMessage(areaJson, "Could not load farm areas"));
      setTerritories([]);
      return;
    }
    const rawTerritories = (terrJson?.data as ApiTerritory[]) ?? [];
    const rawAreas = (areaJson?.data as ApiArea[]) ?? [];
    setTerritories(mergeTerritoriesWithAreas(rawTerritories, rawAreas));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function addTerritory() {
    const name = newTerritoryName.trim();
    if (!name || saving) return;
    setSaving("territory");
    try {
      const res = await fetch("/api/v1/farm-territories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(errorMessage(json, "Create failed"));
      setNewTerritoryName("");
      await load();
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(null);
    }
  }

  async function addArea(territoryId: string) {
    const name = (newAreaByTerritory[territoryId] ?? "").trim();
    if (!name || saving) return;
    setSaving(`area:${territoryId}`);
    try {
      const res = await fetch(`/api/v1/farm-territories/${territoryId}/areas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(errorMessage(json, "Could not add area"));
      setNewAreaByTerritory((prev) => ({ ...prev, [territoryId]: "" }));
      await load();
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Could not add area");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-kp-outline bg-kp-surface">
        <Loader2 className="h-6 w-6 animate-spin text-kp-on-surface-variant" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-kp-outline bg-kp-surface p-5">
      <div>
        <h2 className="text-sm font-semibold text-kp-on-surface">Territories &amp; farm areas</h2>
        <p className="mt-1 text-xs text-kp-on-surface-variant">
          Canonical segments for contacts (membership uses your existing contacts — no duplicate contact types).
        </p>
      </div>

      {listError ? (
        <p className="text-sm text-destructive" role="alert">
          {listError}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="New territory name"
          value={newTerritoryName}
          onChange={(e) => setNewTerritoryName(e.target.value)}
          className="sm:max-w-xs"
          disabled={!!saving}
        />
        <Button
          type="button"
          size="sm"
          className="shrink-0 gap-1"
          disabled={!newTerritoryName.trim() || !!saving}
          onClick={() => void addTerritory()}
        >
          <Plus className="h-4 w-4" />
          Add territory
        </Button>
      </div>

      <ul className="space-y-4">
        {(territories ?? []).map((t) => (
          <li key={t.id} className="rounded-lg border border-kp-outline/80 bg-kp-bg/40 p-4">
            <div className="text-sm font-medium text-kp-on-surface">{t.name}</div>
            {(t.areas ?? []).length === 0 ? (
              <p className="mt-2 text-xs text-kp-on-surface-variant">No areas yet.</p>
            ) : (
              <ul className="mt-2 list-inside list-disc text-xs text-kp-on-surface-variant">
                {(t.areas ?? []).map((a) => (
                  <li key={a.id} className="text-kp-on-surface">
                    <span className="font-medium">{a.name}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="New area name"
                value={newAreaByTerritory[t.id] ?? ""}
                onChange={(e) =>
                  setNewAreaByTerritory((prev) => ({ ...prev, [t.id]: e.target.value }))
                }
                className="sm:max-w-xs"
                disabled={!!saving}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0 gap-1"
                disabled={!(newAreaByTerritory[t.id] ?? "").trim() || !!saving}
                onClick={() => void addArea(t.id)}
              >
                <Plus className="h-4 w-4" />
                Add area
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {(territories?.length ?? 0) === 0 && !listError ? (
        <p className="text-xs text-kp-on-surface-variant">
          Create a territory, then add farm areas. Assign contacts via the API{" "}
          <code className="rounded bg-kp-bg px-1">POST /api/v1/contact-farm-memberships</code>
          .
        </p>
      ) : null}
    </div>
  );
}

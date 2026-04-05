"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UI_COPY } from "@/lib/ui-copy";
import type { FarmStructureVisibility } from "@/lib/validations/farm-structure-visibility";

export type FarmTerritoryRow = {
  id: string;
  name: string;
  description: string | null;
  areaCount: number;
  archived: boolean;
};

export type FarmAreaRow = {
  id: string;
  name: string;
  description: string | null;
  territoryId: string;
  territory: { id: string; name: string };
  membershipCount: number;
  archived: boolean;
};

export function useFarmTrackrStructure() {
  const [structureVisibility, setStructureVisibility] =
    useState<FarmStructureVisibility>("active");
  const [territories, setTerritories] = useState<FarmTerritoryRow[]>([]);
  const [areas, setAreas] = useState<FarmAreaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const v = encodeURIComponent(structureVisibility);
    return Promise.all([
      fetch(`/api/v1/farm-territories?visibility=${v}`),
      fetch(`/api/v1/farm-areas?visibility=${v}`),
    ])
      .then(async ([territoryRes, areaRes]) => {
        const territoryJson = await territoryRes.json();
        const areaJson = await areaRes.json();
        if (territoryJson.error) throw new Error(territoryJson.error.message);
        if (areaJson.error) throw new Error(areaJson.error.message);
        setTerritories(territoryJson.data ?? []);
        setAreas(areaJson.data ?? []);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : UI_COPY.errors.load("farm data"))
      )
      .finally(() => setLoading(false));
  }, [structureVisibility]);

  useEffect(() => {
    void load();
  }, [load]);

  const areasByTerritoryId = useMemo(() => {
    const byTerritory = new Map<string, FarmAreaRow[]>();
    for (const area of areas) {
      byTerritory.set(area.territoryId, [...(byTerritory.get(area.territoryId) ?? []), area]);
    }
    return byTerritory;
  }, [areas]);

  const otherAreaOptions = useMemo(
    () =>
      areas.map((a) => ({
        id: a.id,
        name: a.name,
        territoryName: a.territory.name,
      })),
    [areas]
  );

  return {
    structureVisibility,
    setStructureVisibility,
    territories,
    areas,
    loading,
    error,
    reload: load,
    areasByTerritoryId,
    otherAreaOptions,
  };
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UI_COPY } from "@/lib/ui-copy";

export type FarmTerritoryRow = {
  id: string;
  name: string;
  description: string | null;
  areaCount: number;
};

export type FarmAreaRow = {
  id: string;
  name: string;
  description: string | null;
  territoryId: string;
  territory: { id: string; name: string };
  membershipCount: number;
};

export function useFarmTrackrStructure() {
  const [territories, setTerritories] = useState<FarmTerritoryRow[]>([]);
  const [areas, setAreas] = useState<FarmAreaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return Promise.all([fetch("/api/v1/farm-territories"), fetch("/api/v1/farm-areas")])
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
  }, []);

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
    territories,
    areas,
    loading,
    error,
    reload: load,
    areasByTerritoryId,
    otherAreaOptions,
  };
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { FarmStructureVisibility } from "@/lib/validations/farm-structure-visibility";
import { fetchFarmPerformanceHealth } from "@/lib/farm/farm-performance-health-browser";

type Props = {
  visibility: FarmStructureVisibility;
};

export function FarmTrackrHealthSummaryStrip({ visibility }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [areasNeedingCleanup, setAreasNeedingCleanup] = useState<number | null>(null);
  const [areasWithContacts, setAreasWithContacts] = useState<number | null>(null);
  const [readyToPromote, setReadyToPromote] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const data = await fetchFarmPerformanceHealth(visibility);
        if (cancelled) return;
        setAreasNeedingCleanup(data.summary.areasNeedingCleanup);
        setAreasWithContacts(data.summary.areasWithContacts);
        setReadyToPromote(data.summary.farmStageReadyToPromote);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load health summary");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visibility]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-kp-outline bg-kp-surface-high/30 px-4 py-3 text-xs text-kp-on-surface-variant">
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        Loading data health…
      </div>
    );
  }

  if (error) {
    return null;
  }

  if (areasWithContacts === 0 || areasWithContacts === null) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-kp-outline bg-kp-surface-high/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-kp-on-surface">
        <span className="font-semibold tabular-nums text-kp-on-surface">{areasNeedingCleanup}</span>
        {" of "}
        <span className="tabular-nums">{areasWithContacts}</span> farms have missing contact fields.{" "}
        <span className="font-semibold tabular-nums text-kp-on-surface">{readyToPromote}</span> FARM-stage
        contacts are ready to promote (have email or phone).
      </p>
      <Link
        href="/farm-trackr/performance"
        className="shrink-0 text-xs font-medium text-kp-teal hover:underline"
      >
        Performance &amp; health
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { FarmStructureVisibility } from "@/lib/validations/farm-structure-visibility";
import { fetchFarmPerformanceHealth } from "@/lib/farm/farm-performance-health-browser";
import { contactsCleanupHrefAllFarmScope } from "@/lib/farm/contacts-cleanup-href";

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
      <div className="flex items-center gap-1.5 rounded-md border border-kp-outline/35 bg-kp-surface-high/10 px-2 py-1.5 text-[10px] text-kp-on-surface-variant">
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
        Loading status…
      </div>
    );
  }

  if (error) {
    return null;
  }

  if (areasWithContacts === 0 || areasWithContacts === null) {
    return null;
  }

  const nGap = areasNeedingCleanup ?? 0;
  const nReady = readyToPromote ?? 0;

  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md border border-kp-outline/35 bg-kp-surface-high/10 px-2 py-1.5 text-[10px] leading-snug text-kp-on-surface-variant">
      <span>
        <span className="font-medium tabular-nums text-kp-on-surface">{nGap}</span>{" "}
        {nGap === 1 ? "farm has" : "farms have"} missing data ·{" "}
        <span className="font-medium tabular-nums text-kp-on-surface">{nReady}</span> ready to promote
      </span>
      <span className="text-kp-on-surface-muted" aria-hidden>
        ·
      </span>
      <Link
        href={contactsCleanupHrefAllFarmScope(visibility, { missing: "email" })}
        className="font-medium text-kp-teal hover:underline"
      >
        Fix in ClientKeep
      </Link>
      <span className="text-kp-on-surface-muted" aria-hidden>
        ·
      </span>
      <Link href="/farm-trackr/performance" className="font-medium text-kp-teal hover:underline">
        Performance
      </Link>
    </p>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
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
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  const stripTaskDescription =
    areasNeedingCleanup == null || areasWithContacts == null || readyToPromote == null
      ? "FarmTrackr data health — follow up on missing contact fields and promotions."
      : [
          "FarmTrackr overview health summary",
          `${areasNeedingCleanup} of ${areasWithContacts} farms have missing contact fields.`,
          `${readyToPromote} FARM-stage contacts are ready to promote (have email or phone).`,
          "Open Performance & health for per-farm metrics.",
        ].join("\n");

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
        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
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
    <>
      <div className="rounded-md border border-kp-outline/35 bg-kp-surface-high/10 px-2 py-1.5">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <p className="min-w-0 text-[10px] leading-snug text-kp-on-surface-variant">
            <span className="font-medium tabular-nums text-kp-on-surface">{areasNeedingCleanup}</span>
            {" / "}
            <span className="tabular-nums">{areasWithContacts}</span> farms have field gaps ·{" "}
            <span className="font-medium tabular-nums text-kp-on-surface">{readyToPromote}</span> FARM-stage
            ready to promote.
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 gap-0.5 px-1.5 text-[10px]"
              onClick={() => setTaskModalOpen(true)}
            >
              <CheckSquare className="h-3 w-3" />
              Task
            </Button>
            <Link
              href="/farm-trackr/performance"
              className="text-[10px] font-medium text-kp-teal hover:underline"
            >
              Performance
            </Link>
          </div>
        </div>
        <div className="mt-1.5 border-t border-kp-outline/35 pt-1.5">
          <p className="text-[9px] text-kp-on-surface-muted">ClientKeep (this view)</p>
          <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px]">
            <Link
              href={contactsCleanupHrefAllFarmScope(visibility, { missing: "email" })}
              className="text-kp-teal/95 hover:underline"
            >
              Email
            </Link>
            <Link
              href={contactsCleanupHrefAllFarmScope(visibility, { missing: "phone" })}
              className="text-kp-teal/95 hover:underline"
            >
              Phone
            </Link>
            <Link
              href={contactsCleanupHrefAllFarmScope(visibility, { missing: "mailing" })}
              className="text-kp-teal/95 hover:underline"
            >
              Mailing
            </Link>
            <Link
              href={contactsCleanupHrefAllFarmScope(visibility, { missing: "site" })}
              className="text-kp-teal/95 hover:underline"
            >
              Site
            </Link>
            <Link
              href={contactsCleanupHrefAllFarmScope(visibility, { readyToPromote: true })}
              className="text-kp-teal/95 hover:underline"
            >
              Ready to promote
            </Link>
          </div>
        </div>
      </div>
      <NewTaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        initialTitle="FarmTrackr: clean up contact data"
        initialDescription={stripTaskDescription}
      />
    </>
  );
}

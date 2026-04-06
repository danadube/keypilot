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
    <>
      <div className="flex flex-col gap-2 rounded-lg border border-kp-outline bg-kp-surface-high/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-kp-on-surface">
          <span className="font-semibold tabular-nums text-kp-on-surface">{areasNeedingCleanup}</span>
          {" of "}
          <span className="tabular-nums">{areasWithContacts}</span> farms have missing contact fields.{" "}
          <span className="font-semibold tabular-nums text-kp-on-surface">{readyToPromote}</span> FARM-stage
          contacts are ready to promote (have email or phone).
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setTaskModalOpen(true)}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Add task
          </Button>
          <Link
            href="/farm-trackr/performance"
            className="text-xs font-medium text-kp-teal hover:underline"
          >
            Performance &amp; health
          </Link>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 rounded-lg border border-kp-outline/80 bg-kp-surface-high/15 px-4 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-muted">
          Open in ClientKeep (matches this structure view)
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <Link
            href={contactsCleanupHrefAllFarmScope(visibility, { missing: "email" })}
            className="font-medium text-kp-teal hover:underline"
          >
            Fix missing email
          </Link>
          <Link
            href={contactsCleanupHrefAllFarmScope(visibility, { missing: "phone" })}
            className="font-medium text-kp-teal hover:underline"
          >
            Fix missing phone
          </Link>
          <Link
            href={contactsCleanupHrefAllFarmScope(visibility, { missing: "mailing" })}
            className="font-medium text-kp-teal hover:underline"
          >
            Fix mailing data
          </Link>
          <Link
            href={contactsCleanupHrefAllFarmScope(visibility, { missing: "site" })}
            className="font-medium text-kp-teal hover:underline"
          >
            Fix site data
          </Link>
          <Link
            href={contactsCleanupHrefAllFarmScope(visibility, { readyToPromote: true })}
            className="font-medium text-kp-teal hover:underline"
          >
            Review ready to promote
          </Link>
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

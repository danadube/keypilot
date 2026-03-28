"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { SupraGmailImportStrip } from "@/components/showing-hq/SupraGmailImportStrip";
import { defaultSupraGmailImportStatus } from "@/lib/showing-hq/supra-gmail-import-status";

type DashboardSlice = {
  connections?: { hasGmail?: boolean };
  supraInboxSummary?: {
    lastReceivedAt: string | null;
    queueActionCount: number;
    gmailImport?: {
      automationEnabled: boolean;
      lastRunAt: string | null;
      lastRunSuccess: boolean | null;
      lastRunImported: number | null;
      lastRunRefreshed: number | null;
      lastRunScanned: number | null;
      lastRunError: string | null;
    };
  };
};

/**
 * Supra / Gmail automation for Settings → Integrations (same data as legacy dashboard strip).
 */
export function SupraGmailIntegrationsCard() {
  const [loading, setLoading] = useState(true);
  const [slice, setSlice] = useState<DashboardSlice | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/v1/showing-hq/dashboard")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setSlice(json.data as DashboardSlice);
        else setSlice(null);
      })
      .catch(() => setSlice(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-kp-outline bg-kp-surface">
        <Loader2 className="h-5 w-5 animate-spin text-kp-on-surface-variant" />
      </div>
    );
  }

  if (!slice) {
    return (
      <div className="rounded-xl border border-kp-outline bg-kp-surface px-4 py-6 text-center text-sm text-kp-on-surface-variant">
        Couldn&apos;t load integration status.{" "}
        <button
          type="button"
          className="font-medium text-kp-teal underline-offset-2 hover:underline"
          onClick={() => load()}
        >
          Retry
        </button>
      </div>
    );
  }

  const supra = slice.supraInboxSummary;
  const gmailImport = {
    ...defaultSupraGmailImportStatus(),
    ...supra?.gmailImport,
  };

  return (
    <SupraGmailImportStrip
      hasGmail={slice.connections?.hasGmail ?? false}
      lastReceivedAt={supra?.lastReceivedAt ?? null}
      queueActionCount={supra?.queueActionCount ?? 0}
      gmailImport={gmailImport}
      onImported={load}
      className="bg-kp-surface"
    />
  );
}

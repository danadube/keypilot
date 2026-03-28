"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Inbox, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import {
  formatSupraGmailImportResultSummary,
  relTimeShort,
  type SupraGmailImportStatus,
} from "@/lib/showing-hq/supra-gmail-import-status";

export type { SupraGmailImportStatus };

type SupraGmailImportStripProps = {
  hasGmail: boolean;
  lastReceivedAt: string | null;
  queueActionCount: number;
  gmailImport: SupraGmailImportStatus;
  onImported: () => void;
  className?: string;
};

/**
 * Supra / Gmail ingest: automation status, last run, and Run now (POST import-gmail).
 */
export function SupraGmailImportStrip({
  hasGmail,
  lastReceivedAt,
  queueActionCount,
  gmailImport,
  onImported,
  className,
}: SupraGmailImportStripProps) {
  const [loading, setLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [lastMsg, setLastMsg] = useState<string | null>(null);
  const [automationEnabled, setAutomationEnabled] = useState(gmailImport.automationEnabled);

  useEffect(() => {
    setAutomationEnabled(gmailImport.automationEnabled);
  }, [gmailImport.automationEnabled]);

  const lastRunLabel = relTimeShort(gmailImport.lastRunAt);
  const automationSummary = automationEnabled
    ? "Automatic import is on."
    : "Automatic import is off. We’ll only check Gmail when you run it yourself.";

  const resultSummary = useMemo(
    () => formatSupraGmailImportResultSummary(gmailImport, hasGmail),
    [gmailImport, hasGmail]
  );

  const setAutomation = useCallback(
    async (enabled: boolean) => {
      setToggleLoading(true);
      try {
        const res = await fetch("/api/v1/showing-hq/supra-gmail-import-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ automationEnabled: enabled }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        if (!res.ok) {
          setLastMsg(json.error?.message ?? "Couldn’t update settings");
          return;
        }
        setAutomationEnabled(enabled);
        onImported();
      } catch {
        setLastMsg("Couldn’t update settings");
      } finally {
        setToggleLoading(false);
      }
    },
    [onImported]
  );

  const runImport = () => {
    setLoading(true);
    setLastMsg(null);
    fetch("/api/v1/showing-hq/supra-queue/import-gmail", { method: "POST" })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          data?: { imported?: number; refreshed?: number; scanned?: number };
          error?: { message?: string };
        };
        if (!res.ok) {
          setLastMsg(json.error?.message ?? "Import failed");
          return;
        }
        const d = json.data;
        if (d) {
          setLastMsg(
            `Imported ${d.imported ?? 0} new, refreshed ${d.refreshed ?? 0} (scanned ${d.scanned ?? 0}).`
          );
        }
        onImported();
      })
      .catch(() => setLastMsg("Import failed"))
      .finally(() => setLoading(false));
  };

  const lastQueueMsgLabel = lastReceivedAt
    ? new Date(lastReceivedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div
      className={cn(
        "rounded-xl border border-kp-outline bg-kp-surface-high/80 px-4 py-3",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-kp-teal/10">
            <Inbox className="h-4 w-4 text-kp-teal" />
          </div>
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-semibold text-kp-on-surface">Supra inbox (Gmail)</p>
            <p className="text-[11px] leading-snug text-kp-on-surface-variant">{automationSummary}</p>
            {hasGmail && lastRunLabel ? (
              <p className="text-[11px] text-kp-on-surface-variant">
                Last checked {lastRunLabel}
                {gmailImport.lastRunSuccess === false ? (
                  <span className="font-medium text-amber-600 dark:text-amber-400"> · failed</span>
                ) : gmailImport.lastRunAt ? (
                  <span className="text-kp-on-surface-variant"> · succeeded</span>
                ) : null}
              </p>
            ) : null}
            {resultSummary ? (
              <p className="text-[11px] leading-snug text-kp-on-surface-variant">{resultSummary}</p>
            ) : null}
            <p className="text-[11px] leading-snug text-kp-on-surface-variant">
              {lastQueueMsgLabel ? (
                <>Latest in queue: {lastQueueMsgLabel}. </>
              ) : (
                <>No Supra messages in your review queue yet. </>
              )}
              {queueActionCount > 0 ? (
                <>
                  <Link
                    href="/showing-hq/supra-inbox"
                    className="font-medium text-kp-teal underline-offset-2 hover:underline"
                  >
                    {queueActionCount} need review
                  </Link>
                  .
                </>
              ) : (
                <>Queue is clear for actionable items.</>
              )}
            </p>
            {hasGmail ? (
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-kp-on-surface-variant">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-kp-outline bg-kp-surface-high text-kp-teal focus:ring-kp-teal/40"
                  checked={automationEnabled}
                  disabled={toggleLoading}
                  onChange={(e) => void setAutomation(e.target.checked)}
                />
                <span>
                  {toggleLoading ? "Saving…" : "Let ShowingHQ check Gmail automatically on a schedule"}
                </span>
              </label>
            ) : null}
            {lastMsg && (
              <p className="text-[11px] text-kp-on-surface-variant" role="status">
                {lastMsg}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!hasGmail || loading}
            onClick={runImport}
            className={cn(kpBtnPrimary, "h-8 gap-1.5 text-xs")}
            title={
              hasGmail
                ? "Check Gmail now for new Supra messages"
                : "Connect Gmail under Settings → Connections"
            }
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Run now
          </Button>
          <Button variant="outline" size="sm" asChild className={cn(kpBtnSecondary, "h-8 text-xs")}>
            <Link href="/showing-hq/supra-inbox">Open inbox</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

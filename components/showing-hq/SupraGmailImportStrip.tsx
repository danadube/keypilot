"use client";

import { useState } from "react";
import Link from "next/link";
import { Inbox, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";

type SupraGmailImportStripProps = {
  hasGmail: boolean;
  lastReceivedAt: string | null;
  queueActionCount: number;
  onImported: () => void;
  className?: string;
};

/**
 * Supra / Gmail ingest status + manual “import now” (POST import-gmail).
 * Server-side scheduled scraping is not wired — copy explains the gap.
 */
export function SupraGmailImportStrip({
  hasGmail,
  lastReceivedAt,
  queueActionCount,
  onImported,
  className,
}: SupraGmailImportStripProps) {
  const [loading, setLoading] = useState(false);
  const [lastMsg, setLastMsg] = useState<string | null>(null);

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
            `Imported ${d.imported ?? 0}, refreshed ${d.refreshed ?? 0} (scanned ${d.scanned ?? 0})`
          );
        }
        onImported();
      })
      .catch(() => setLastMsg("Import failed"))
      .finally(() => setLoading(false));
  };

  const lastLabel = lastReceivedAt
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
          <div className="min-w-0">
            <p className="text-xs font-semibold text-kp-on-surface">Supra inbox (Gmail)</p>
            <p className="mt-0.5 text-[11px] leading-snug text-kp-on-surface-variant">
              {lastLabel ? (
                <>Last message in queue: {lastLabel}. </>
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
            <p className="mt-1.5 text-[10px] leading-snug text-kp-on-surface-variant/90">
              Automatic scheduling from the server is not enabled yet — use Import now when Gmail is
              connected, or paste email under Supra Inbox.
            </p>
            {lastMsg && (
              <p className="mt-1 text-[11px] text-kp-on-surface-variant" role="status">
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
                ? "Pull recent Supra-related Gmail into the review queue"
                : "Connect Gmail under Settings → Connections"
            }
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Import now
          </Button>
          <Button variant="outline" size="sm" asChild className={cn(kpBtnSecondary, "h-8 text-xs")}>
            <Link href="/showing-hq/supra-inbox">Open inbox</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

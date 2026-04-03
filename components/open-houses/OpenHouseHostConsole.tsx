"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/track-usage-client";
import {
  Calendar,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  Loader2,
  Printer,
  QrCode,
  Radio,
  Users,
  FileText,
  Mail,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { OpenHouseSupportPageFrame } from "@/components/showing-hq/OpenHouseSupportPageFrame";
import { InviteHostDialog } from "@/components/open-houses/InviteHostDialog";
import {
  buildOpenHousePrepChecklist,
  formatMissingPrepGuidance,
} from "@/lib/showing-hq/prep-checklist";
import { openHouseWorkflowTabHref } from "@/lib/showing-hq/showing-workflow-hrefs";
import { UI_COPY } from "@/lib/ui-copy";

type HostConsoleOpenHouse = {
  id: string;
  title: string;
  status: string;
  startAt: string;
  endAt: string;
  qrSlug: string;
  qrCodeDataUrl?: string | null;
  notes?: string | null;
  hostNotes?: string | null;
  hostAgentId?: string | null;
  prepChecklistFlags?: Record<string, unknown> | null;
  flyerUrl?: string | null;
  flyerOverrideUrl?: string | null;
  agentName?: string | null;
  agentEmail?: string | null;
  property: {
    address1: string;
    address2?: string | null;
    city: string;
    state: string;
    zip: string;
    flyerUrl?: string | null;
  };
  hostAgent?: { id: string; name: string | null; email: string | null } | null;
  hosts?: { id: string }[];
  _count: { visitors: number };
  draftStatusCounts?: {
    DRAFT: number;
    REVIEWED: number;
    SENT_MANUAL: number;
    ARCHIVED: number;
  };
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Relative phrase for time until a timestamp (from `now`). */
function timeUntil(targetMs: number, nowMs: number): string {
  const ms = targetMs - nowMs;
  if (ms <= 0) return "now";
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 1) return "under a minute";
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function timeSince(pastMs: number, nowMs: number): string {
  const ms = nowMs - pastMs;
  if (ms < 60000) return "just now";
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin} min ago`;
  const h = Math.floor(totalMin / 60);
  return `${h}h ago`;
}

function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function OpenHouseHostConsole({ openHouseId }: { openHouseId: string }) {
  const [data, setData] = useState<HostConsoleOpenHouse | null>(null);
  const [reportSummary, setReportSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingLive, setMarkingLive] = useState(false);
  const [copied, setCopied] = useState(false);
  const now = useNow();

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [ohRes, repRes] = await Promise.all([
        fetch(`/api/v1/open-houses/${openHouseId}`),
        fetch(`/api/v1/open-houses/${openHouseId}/report`),
      ]);
      const ohJson = await ohRes.json();
      if (ohJson.error) {
        setError(ohJson.error.message);
        setData(null);
      } else {
        setData(ohJson.data);
      }
      let summary: string | null = null;
      if (repRes.ok) {
        const repJson = await repRes.json();
        if (!repJson.error && repJson.data?.createdAt) {
          summary = `Last generated ${new Date(repJson.data.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}`;
        }
      }
      setReportSummary(summary);
    } catch {
      setError(UI_COPY.errors.load("open house"));
    } finally {
      setLoading(false);
    }
  }, [openHouseId]);

  useEffect(() => {
    trackEvent("host_console_opened", { openHouseId });
  }, [openHouseId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkLive = async () => {
    if (!data || data.status !== "SCHEDULED") return;
    setMarkingLive(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/open-houses/${openHouseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setData((prev) => (prev ? { ...prev, status: "ACTIVE" } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start open house");
    } finally {
      setMarkingLive(false);
    }
  };

  const handleCopyVisitorLink = async () => {
    if (!data || typeof window === "undefined") return;
    const url = `${window.location.origin}/oh/${data.qrSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  };

  if (loading) {
    return (
      <OpenHouseSupportPageFrame openHouseId={openHouseId} withContentCard={false}>
        <div className="flex justify-center py-16">
          <PageLoading message="Loading host console…" />
        </div>
      </OpenHouseSupportPageFrame>
    );
  }

  if (error || !data) {
    return (
      <OpenHouseSupportPageFrame openHouseId={openHouseId} withContentCard={false}>
        <div className="py-8">
          <ErrorMessage message={error || "Not found"} onRetry={load} />
        </div>
      </OpenHouseSupportPageFrame>
    );
  }

  const prepItems = buildOpenHousePrepChecklist({
    flyerUrl: data.flyerUrl,
    flyerOverrideUrl: data.flyerOverrideUrl,
    propertyFlyerUrl: data.property?.flyerUrl,
    qrSlug: data.qrSlug,
    notes: data.notes,
    hostNotes: data.hostNotes,
    hostAgentId: data.hostAgentId,
    nonListingHostCount: data.hosts?.length,
    prepChecklistFlags: data.prepChecklistFlags ?? null,
  });
  const prepDone = prepItems.filter((i) => i.complete).length;
  const prepTotal = prepItems.length;
  const prepGuidance = formatMissingPrepGuidance(prepItems);
  const drafts = data.draftStatusCounts ?? {
    DRAFT: 0,
    REVIEWED: 0,
    SENT_MANUAL: 0,
    ARCHIVED: 0,
  };
  const followUpDraftsTotal =
    drafts.DRAFT + drafts.REVIEWED + drafts.SENT_MANUAL + drafts.ARCHIVED;
  const followUpsNeedAction = drafts.DRAFT + drafts.REVIEWED;
  const visitorCount = data._count?.visitors ?? 0;

  const visitorUrl =
    typeof window !== "undefined" ? `${window.location.origin}/oh/${data.qrSlug}` : "";

  const contextSubtitle = [data.property.address1, data.property.city]
    .filter(Boolean)
    .join(", ");

  const startMs = new Date(data.startAt).getTime();
  const endMs = new Date(data.endAt).getTime();

  let liveProgressLine: string | null = null;
  if (data.status === "ACTIVE") {
    const untilEnd = timeUntil(endMs, now);
    const sinceStart = timeSince(startMs, now);
    if (now < startMs) {
      liveProgressLine = `Starts in ${timeUntil(startMs, now)} · ends ${formatTime(data.endAt)}`;
    } else {
      liveProgressLine =
        untilEnd === "now"
          ? `Window closing · ended ${formatTime(data.endAt)}`
          : `${untilEnd} left in event · started ${sinceStart}`;
    }
  }

  let scheduledLine: string | null = null;
  if (data.status === "SCHEDULED") {
    scheduledLine =
      now < startMs
        ? `Starts in ${timeUntil(startMs, now)} — then open visitor sign-in when you’re ready.`
        : `Your start time has passed — tap Start Open House when the door is open.`;
  }

  const visitorStatLabel =
    visitorCount === 0
      ? "Waiting for first check-in"
      : visitorCount === 1
        ? "1 visitor checked in"
        : `${visitorCount} visitors checked in`;

  const visitorStatHint =
    visitorCount === 0
      ? data.status === "ACTIVE"
        ? "Share the link or leave tablet mode open."
        : "Opens once the event is live and guests arrive."
      : "Tap to see names and notes →";

  const followUpLabel =
    followUpDraftsTotal === 0
      ? "No follow-up drafts yet"
      : followUpsNeedAction > 0
        ? `${followUpsNeedAction} draft${followUpsNeedAction === 1 ? "" : "s"} need a send`
        : followUpDraftsTotal === 1
          ? "1 draft on file"
          : `${followUpDraftsTotal} drafts on file`;

  const followUpHint =
    followUpDraftsTotal === 0
      ? "Drafts appear as you capture visitors."
      : followUpsNeedAction > 0
        ? "Review and send from follow-ups →"
        : "All caught up or archived →";

  const reportLabel =
    reportSummary ?? (data.status === "COMPLETED" ? "Ready to generate after wrap-up" : "Not generated yet");

  const reportHint =
    reportSummary != null
      ? "Open or refresh the seller report →"
      : data.status === "COMPLETED"
        ? "Summarize the day for your seller →"
        : "Available after the event winds down →";

  return (
    <OpenHouseSupportPageFrame
      openHouseId={openHouseId}
      contextSubtitle={contextSubtitle}
      maxWidthClass="max-w-4xl"
      withContentCard={false}
      className="pb-10"
    >
      {/* Event state hero — start / live / complete */}
      <section
        className={cn(
          "relative mb-8 rounded-2xl px-5 py-6 sm:px-6",
          data.status === "ACTIVE" &&
            "border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-kp-surface-high/20 to-transparent",
          data.status === "SCHEDULED" && "border border-kp-outline/50 bg-kp-surface-high/15",
          data.status === "COMPLETED" && "border border-kp-outline/40 bg-kp-surface-high/10",
          data.status === "DRAFT" && "border border-dashed border-kp-outline/60 bg-kp-bg/20",
          data.status === "CANCELLED" && "border border-red-500/20 bg-red-500/5"
        )}
      >
        {data.status === "ACTIVE" ? (
          <div
            className="pointer-events-none absolute left-5 top-5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgb(52,211,153,0.8)] sm:left-6 sm:top-6"
            aria-hidden
          />
        ) : null}

        <div className={cn(data.status === "ACTIVE" && "sm:pl-4")}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
            Open house
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-kp-on-surface sm:text-2xl">
              {data.title}
            </h1>
          </div>
          <p className="mt-2 text-sm text-kp-on-surface-variant">
            {data.property.address1}
            {data.property.city ? ` · ${data.property.city}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-kp-on-surface-variant">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 opacity-80" />
              {formatDate(data.startAt)} · {formatTime(data.startAt)} – {formatTime(data.endAt)}
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              {data.status === "DRAFT" && (
                <>
                  <p className="text-xs font-semibold text-kp-on-surface">Draft</p>
                  <p className="text-sm text-kp-on-surface-variant">
                    Publish in workspace before you can start the event.
                    <Link
                      href={openHouseWorkflowTabHref(openHouseId, "details")}
                      className="ml-1 font-medium text-kp-teal hover:underline"
                    >
                      Open workspace
                    </Link>
                  </p>
                </>
              )}
              {data.status === "SCHEDULED" && (
                <>
                  <p className="text-xs font-semibold text-amber-100/90">Scheduled</p>
                  {scheduledLine ? (
                    <p className="text-sm text-kp-on-surface-variant">{scheduledLine}</p>
                  ) : null}
                </>
              )}
              {data.status === "ACTIVE" && (
                <>
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                    <Radio className="h-4 w-4 animate-pulse text-emerald-400" />
                    Open House Live
                  </p>
                  {liveProgressLine ? (
                    <p className="text-sm text-kp-on-surface-variant">{liveProgressLine}</p>
                  ) : null}
                </>
              )}
              {data.status === "COMPLETED" && (
                <>
                  <p className="text-xs font-semibold text-kp-on-surface">Complete</p>
                  <p className="text-sm text-kp-on-surface-variant">
                    This event is wrapped. Visitor links and history stay available.
                  </p>
                </>
              )}
              {data.status === "CANCELLED" && (
                <>
                  <p className="text-xs font-semibold text-red-300/90">Cancelled</p>
                  <p className="text-sm text-kp-on-surface-variant">No live run — open a new event if needed.</p>
                </>
                )}
            </div>

            <div className="shrink-0">
              {data.status === "SCHEDULED" && (
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className={cn(kpBtnPrimary, "h-10 border-transparent px-5 shadow-sm")}
                  disabled={markingLive}
                  onClick={handleMarkLive}
                >
                  {markingLive ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting…
                    </>
                  ) : (
                    <>
                      <Radio className="mr-2 h-4 w-4" />
                      Start Open House
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Prep — one light strip */}
      <div className="mb-8 flex flex-col gap-2 border-b border-kp-outline/40 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-kp-on-surface-variant">
            Prep · {prepDone}/{prepTotal}
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {prepItems.map((i) => (
              <li
                key={i.id}
                className="flex items-center gap-1.5 text-xs text-kp-on-surface-variant"
              >
                <CheckCircle2
                  className={cn(
                    "h-3 w-3 shrink-0",
                    i.complete ? "text-emerald-400/90" : "text-kp-outline"
                  )}
                />
                <span className={cn(!i.complete && "text-kp-on-surface")}>{i.label}</span>
              </li>
            ))}
          </ul>
          {prepGuidance ? (
            <p className="mt-2 text-xs text-amber-200/85">{prepGuidance}</p>
          ) : (
            <p className="mt-2 text-xs text-emerald-400/80">Ready to welcome guests.</p>
          )}
        </div>
        <Link
          href={openHouseWorkflowTabHref(openHouseId, "prep")}
          className="shrink-0 text-xs font-medium text-kp-teal hover:underline"
        >
          Edit in workspace
        </Link>
      </div>

      {/* Actions — primary vs secondary */}
      <div className="mb-8 space-y-6">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-kp-on-surface-variant">
            Visitor access
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="default" className={cn(kpBtnPrimary, "h-10 border-transparent")} asChild>
              <a href={visitorUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open visitor sign-in
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="default"
              className={cn(kpBtnPrimary, "h-10 border-kp-outline/80 bg-kp-surface-high/30")}
              onClick={handleCopyVisitorLink}
            >
              <ClipboardCopy className="mr-2 h-4 w-4" />
              {copied ? "Copied link" : "Copy sign-in link"}
            </Button>
          </div>
          <p className="mt-2 max-w-lg text-xs text-kp-on-surface-variant">
            Guests use the public page — nothing here replaces their sign-in flow.
          </p>
        </div>

        <div className="h-px bg-kp-outline/35" aria-hidden />

        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-kp-on-surface-variant">
            At the door &amp; team
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-9")} asChild>
              <Link href={`/open-houses/${openHouseId}/sign-in/tablet`}>
                <QrCode className="mr-2 h-3.5 w-3.5" />
                Tablet mode
              </Link>
            </Button>
            <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-9")} asChild>
              <Link href={`/open-houses/${openHouseId}/sign-in/print`}>
                <Printer className="mr-2 h-3.5 w-3.5" />
                Print QR poster
              </Link>
            </Button>
            <InviteHostDialog
              openHouseId={openHouseId}
              onInviteSent={load}
              triggerLabel="Invite co-host"
              triggerClassName={cn(kpBtnSecondary, "h-9")}
              triggerIcon={UserPlus}
            />
          </div>
        </div>
      </div>

      {/* Live pulse stats — minimal chrome */}
      <section>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-kp-on-surface-variant">
          Right now
        </p>
        <div className="grid gap-0 divide-y divide-kp-outline/35 rounded-xl border border-kp-outline/40 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Link
            href={`/open-houses/${openHouseId}/visitors`}
            className="flex flex-col px-4 py-4 transition-colors hover:bg-kp-surface-high/20 sm:px-3"
          >
            <span className="flex items-center gap-2 text-xs text-kp-on-surface-variant">
              <Users className="h-3.5 w-3.5" />
              Visitors
            </span>
            <span className="mt-1 text-2xl font-semibold tabular-nums text-kp-on-surface">{visitorCount}</span>
            <span className="mt-1 text-xs text-kp-on-surface">{visitorStatLabel}</span>
            <span className="mt-0.5 text-[11px] text-kp-teal/90">{visitorStatHint}</span>
          </Link>
          <Link
            href={`/open-houses/${openHouseId}/follow-ups`}
            className="flex flex-col px-4 py-4 transition-colors hover:bg-kp-surface-high/20 sm:px-3"
          >
            <span className="flex items-center gap-2 text-xs text-kp-on-surface-variant">
              <Mail className="h-3.5 w-3.5" />
              Follow-ups
            </span>
            <span className="mt-1 text-2xl font-semibold tabular-nums text-kp-on-surface">{followUpDraftsTotal}</span>
            <span className="mt-1 text-xs text-kp-on-surface">{followUpLabel}</span>
            <span className="mt-0.5 text-[11px] text-kp-on-surface-variant/90">{followUpHint}</span>
          </Link>
          <Link
            href={`/open-houses/${openHouseId}/report`}
            className="flex flex-col px-4 py-4 transition-colors hover:bg-kp-surface-high/20 sm:px-3"
          >
            <span className="flex items-center gap-2 text-xs text-kp-on-surface-variant">
              <FileText className="h-3.5 w-3.5" />
              Seller report
            </span>
            <span className="mt-1 text-sm font-medium leading-snug text-kp-on-surface">{reportLabel}</span>
            <span className="mt-1 text-[11px] text-kp-teal/90">{reportHint}</span>
          </Link>
        </div>
      </section>
    </OpenHouseSupportPageFrame>
  );
}

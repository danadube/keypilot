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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  kpBtnPrimary,
  kpBtnSecondary,
  kpBtnTertiary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { OpenHouseSupportPageFrame } from "@/components/showing-hq/OpenHouseSupportPageFrame";
import { InviteHostDialog } from "@/components/open-houses/InviteHostDialog";
import {
  buildOpenHousePrepChecklist,
  formatMissingPrepGuidance,
} from "@/lib/showing-hq/prep-checklist";
import { openHouseWorkflowTabHref } from "@/lib/showing-hq/showing-workflow-hrefs";

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
    year: "numeric",
  });
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusBadge(status: string) {
  const map: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
    ACTIVE: { variant: "default", label: "Live" },
    SCHEDULED: { variant: "secondary", label: "Scheduled" },
    DRAFT: { variant: "outline", label: "Draft" },
    COMPLETED: { variant: "outline", label: "Complete" },
    CANCELLED: { variant: "destructive", label: "Cancelled" },
  };
  const m = map[status] ?? { variant: "outline", label: status };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function OpenHouseHostConsole({ openHouseId }: { openHouseId: string }) {
  const [data, setData] = useState<HostConsoleOpenHouse | null>(null);
  const [reportSummary, setReportSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingLive, setMarkingLive] = useState(false);
  const [copied, setCopied] = useState(false);

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
      setError("Failed to load");
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
      setError(e instanceof Error ? e.message : "Could not mark event live");
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
  const visitorUrl =
    typeof window !== "undefined" ? `${window.location.origin}/oh/${data.qrSlug}` : "";

  const contextSubtitle = [data.property.address1, data.property.city]
    .filter(Boolean)
    .join(", ");

  const hostRosterOk = Boolean(data.hostAgentId?.trim()) || (data.hosts?.length ?? 0) > 0;
  const hostLine = data.hostAgent?.name
    ? `${data.hostAgent.name}${data.hostAgent.email ? ` · ${data.hostAgent.email}` : ""}`
    : hostRosterOk
      ? "Host assigned"
      : "No dedicated host on file — invite or assign in prep.";

  return (
    <OpenHouseSupportPageFrame
      openHouseId={openHouseId}
      contextSubtitle={contextSubtitle}
      maxWidthClass="max-w-4xl"
      withContentCard={false}
      className="pb-10"
    >
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-kp-outline/60 pb-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-teal">
            Live open house · Host console
          </p>
          <h1 className="mt-1 text-xl font-semibold text-kp-on-surface sm:text-2xl">{data.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-kp-on-surface-variant">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>
              {formatDate(data.startAt)} · {formatTime(data.startAt)} – {formatTime(data.endAt)}
            </span>
          </div>
          <p className="mt-2 text-sm text-kp-on-surface">
            {data.property.address1}
            {data.property.address2 ? `, ${data.property.address2}` : ""}
          </p>
          <p className="text-sm text-kp-on-surface-variant">
            {data.property.city}, {data.property.state} {data.property.zip}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">{statusBadge(data.status)}</div>
      </header>

      {/* Prep snapshot */}
      <section className="mb-6 rounded-xl border border-kp-outline/70 bg-kp-surface-high/30 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-kp-on-surface">Prep checklist</p>
          <p className="text-[11px] tabular-nums text-kp-on-surface-variant">
            {prepDone}/{prepTotal} complete
          </p>
        </div>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {prepItems.map((i) => (
            <li
              key={i.id}
              className="flex items-center gap-2 text-[11px] text-kp-on-surface-variant"
            >
              <CheckCircle2
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  i.complete ? "text-emerald-400" : "text-kp-outline"
                )}
              />
              <span className={i.complete ? "text-kp-on-surface-variant" : "text-kp-on-surface"}>
                {i.label}
              </span>
            </li>
          ))}
        </ul>
        {prepGuidance ? (
          <p className="mt-2 text-[11px] leading-snug text-amber-200/90">{prepGuidance}</p>
        ) : (
          <p className="mt-2 text-[11px] text-emerald-400/90">Prep looks complete for launch.</p>
        )}
        <Button variant="ghost" size="sm" className={cn(kpBtnTertiary, "mt-2 h-8 px-2 text-[11px]")} asChild>
          <Link href={openHouseWorkflowTabHref(openHouseId, "prep")}>Edit prep in workspace</Link>
        </Button>
      </section>

      {/* Primary actions */}
      <section className="mb-6">
        <p className="mb-2 text-xs font-semibold text-kp-on-surface">Run the event</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className={cn(kpBtnPrimary, "border-transparent")} asChild>
            <a href={visitorUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open visitor sign-in
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(kpBtnSecondary)}
            onClick={handleCopyVisitorLink}
          >
            <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy sign-in link"}
          </Button>
          <Button variant="outline" size="sm" className={cn(kpBtnSecondary)} asChild>
            <Link href={`/open-houses/${openHouseId}/sign-in/tablet`}>
              <QrCode className="mr-1.5 h-3.5 w-3.5" />
              Tablet walk-in check-in
            </Link>
          </Button>
          <Button variant="outline" size="sm" className={cn(kpBtnSecondary)} asChild>
            <Link href={`/open-houses/${openHouseId}/sign-in/print`}>
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print QR poster
            </Link>
          </Button>
        </div>
        <p className="mt-2 max-w-xl text-[10px] leading-relaxed text-kp-on-surface-variant">
          Visitor sign-in lives on the public page — use this console to copy the link, print QR, or open
          the door-side tablet mode. Guests never need the dashboard.
        </p>
      </section>

      {/* Host + go live */}
      <section className="mb-6 rounded-xl border border-kp-outline/60 bg-kp-bg/25 px-4 py-3">
        <p className="text-xs font-semibold text-kp-on-surface">Host</p>
        <p className="mt-1 text-[12px] text-kp-on-surface-variant">{hostLine}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <InviteHostDialog
            openHouseId={openHouseId}
            onInviteSent={load}
            triggerLabel="Invite co-host"
          />
          <Button variant="outline" size="sm" className={cn(kpBtnTertiary, "h-8 text-xs")} asChild>
            <Link href={openHouseWorkflowTabHref(openHouseId, "prep")}>Confirm in workspace</Link>
          </Button>
        </div>
      </section>

      <section className="mb-6">
        {data.status === "DRAFT" ? (
          <p className="text-[12px] text-kp-on-surface-variant">
            Publish this event from the workspace before you can mark it live.
            <Link
              href={openHouseWorkflowTabHref(openHouseId, "details")}
              className="ml-1 font-medium text-kp-teal hover:underline"
            >
              Open workspace
            </Link>
          </p>
        ) : data.status === "SCHEDULED" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(kpBtnPrimary, "border-transparent")}
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
                Mark event live
              </>
            )}
          </Button>
        ) : data.status === "ACTIVE" ? (
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-400">
            <Radio className="h-4 w-4" />
            Event is live — visitors can sign in now.
          </p>
        ) : (
          <p className="text-[12px] text-kp-on-surface-variant">
            This event is {data.status.toLowerCase()}. Visitor links still work for history; start a new
            event for a new day.
          </p>
        )}
      </section>

      {/* Live stats */}
      <section className="rounded-xl border border-kp-outline/70 bg-kp-surface-high/20 px-4 py-4">
        <p className="mb-3 text-xs font-semibold text-kp-on-surface">Event stats</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href={`/open-houses/${openHouseId}/visitors`}
            className="rounded-lg border border-kp-outline/50 bg-kp-surface/50 px-3 py-2.5 transition-colors hover:border-kp-outline"
          >
            <div className="flex items-center gap-2 text-kp-on-surface-variant">
              <Users className="h-4 w-4" />
              <span className="text-[11px] font-medium">Visitors checked in</span>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-kp-on-surface">
              {data._count?.visitors ?? 0}
            </p>
            <p className="text-[10px] text-kp-teal">View list →</p>
          </Link>
          <Link
            href={`/open-houses/${openHouseId}/follow-ups`}
            className="rounded-lg border border-kp-outline/50 bg-kp-surface/50 px-3 py-2.5 transition-colors hover:border-kp-outline"
          >
            <div className="flex items-center gap-2 text-kp-on-surface-variant">
              <Mail className="h-4 w-4" />
              <span className="text-[11px] font-medium">Follow-up drafts</span>
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-kp-on-surface">
              {followUpDraftsTotal}
            </p>
            <p className="text-[10px] text-kp-on-surface-variant">
              {drafts.DRAFT + drafts.REVIEWED > 0
                ? `${drafts.DRAFT + drafts.REVIEWED} need action`
                : "All clear or sent"}
            </p>
          </Link>
          <Link
            href={`/open-houses/${openHouseId}/report`}
            className="rounded-lg border border-kp-outline/50 bg-kp-surface/50 px-3 py-2.5 transition-colors hover:border-kp-outline"
          >
            <div className="flex items-center gap-2 text-kp-on-surface-variant">
              <FileText className="h-4 w-4" />
              <span className="text-[11px] font-medium">Seller report</span>
            </div>
            <p className="mt-1 text-sm font-medium text-kp-on-surface">
              {reportSummary ?? "Not generated yet"}
            </p>
            <p className="text-[10px] text-kp-teal">Open report →</p>
          </Link>
        </div>
      </section>
    </OpenHouseSupportPageFrame>
  );
}

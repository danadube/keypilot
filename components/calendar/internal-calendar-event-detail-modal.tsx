"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import type { CalendarEvent } from "@/lib/calendar/calendar-event-types";
import {
  formatCalendarWhenForDetail,
  localDateKey,
} from "@/lib/calendar/calendar-event-day-utils";

function outboundRetryPayload(ev: CalendarEvent): {
  sourceType: "SHOWING" | "TASK" | "FOLLOW_UP" | "TRANSACTION_CHECKLIST" | "TRANSACTION_CLOSING";
  sourceId: string;
} | null {
  switch (ev.sourceType) {
    case "showing":
      return { sourceType: "SHOWING", sourceId: ev.relatedEntityId };
    case "task":
      return { sourceType: "TASK", sourceId: ev.relatedEntityId };
    case "follow_up":
      return { sourceType: "FOLLOW_UP", sourceId: ev.relatedEntityId };
    case "transaction": {
      const m = ev.metadata as { milestoneKind?: string; kind?: string } | undefined;
      if (m?.milestoneKind === "closing" || m?.kind === "closing") {
        return { sourceType: "TRANSACTION_CLOSING", sourceId: ev.relatedEntityId };
      }
      return { sourceType: "TRANSACTION_CHECKLIST", sourceId: ev.relatedEntityId };
    }
    default:
      return null;
  }
}

const CALLOUT =
  "rounded-lg border border-kp-outline/45 bg-kp-bg/70 px-3 py-2.5 text-xs leading-relaxed text-kp-on-surface-muted";

type InternalMeta = {
  subline?: string;
  workspace?: string;
  contactName?: string;
  taskPlainTitle?: string | null;
  milestoneKind?: string;
  kind?: string;
  googleOutbound?: {
    status: string;
    lastSyncedAt: string | null;
    lastError: string | null;
    googleCalendarId?: string;
    targetCalendarSummary?: string | null;
    openInGoogleUrl?: string | null;
    googleAccountEmail?: string | null;
  };
};

function stripTitlePrefix(title: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}\\s*[—-]\\s*`, "i");
  const s = title.replace(re, "").trim();
  return s || title;
}

function followUpDueLine(due: Date, reference: Date): { className: string; text: string } {
  if (reference.getTime() > due.getTime()) {
    return { className: "text-amber-800/95 dark:text-amber-200/95", text: "Overdue — follow up soon" };
  }
  if (localDateKey(due) === localDateKey(reference)) {
    return {
      className: "text-kp-on-surface",
      text: `Due today · ${due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`,
    };
  }
  return {
    className: "text-kp-on-surface-muted",
    text: `Due ${due.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
  };
}

function modalDescription(ev: CalendarEvent, workspaceHint: string | undefined): string {
  const w = workspaceHint?.trim();
  switch (ev.sourceType) {
    case "showing":
      return w ? `${w} · Private showing` : "ShowingHQ · Private showing";
    case "task":
      return w ? `${w} · Open task` : "Task Pilot · Open task";
    case "follow_up":
      return w ? `${w} · Contact follow-up` : "ClientKeep · Contact follow-up";
    case "transaction":
      return w ? `${w} · Deal milestone` : "TransactionHQ · Deal milestone";
    default:
      return ev.sourceLabel;
  }
}

export function InternalCalendarEventDetailModal({
  ev,
  open,
  onOpenChange,
  onTaskCompleted,
  onOutboundRetried,
}: {
  ev: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCompleted?: () => void | Promise<void>;
  /** Called after a successful outbound retry so the parent can refetch calendar data. */
  onOutboundRetried?: () => void | Promise<void>;
}) {
  const [completing, setCompleting] = useState(false);
  const [retryingOutbound, setRetryingOutbound] = useState(false);

  const markTaskComplete = useCallback(async () => {
    if (!ev || ev.sourceType !== "task") return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/v1/tasks/${ev.relatedEntityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { error?: { message?: string } }).error?.message ?? "Could not complete task");
      }
      toast.success("Task completed");
      await onTaskCompleted?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not complete task");
    } finally {
      setCompleting(false);
    }
  }, [ev, onOpenChange, onTaskCompleted]);

  const retryOutboundSync = useCallback(async () => {
    if (!ev) return;
    const payload = outboundRetryPayload(ev);
    if (!payload) return;
    setRetryingOutbound(true);
    try {
      const res = await fetch("/api/v1/calendar/google-outbound/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { error?: { message?: string } }).error?.message ?? "Retry failed");
      }
      toast.success("Sync to Google retried");
      await onOutboundRetried?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not retry sync");
    } finally {
      setRetryingOutbound(false);
    }
  }, [ev, onOutboundRetried]);

  if (!ev) return null;
  if (ev.sourceType === "external" || ev.sourceType === "holiday") return null;

  const meta = ev.metadata as InternalMeta | undefined;
  const workspace = meta?.workspace;
  const whenLine = formatCalendarWhenForDetail(ev);
  const description = modalDescription(ev, workspace);
  const referenceNow = new Date();

  let headline = ev.title;
  if (ev.sourceType === "task") {
    headline = (meta?.taskPlainTitle?.trim() ? meta.taskPlainTitle : stripTitlePrefix(ev.title, "Task")).trim() || ev.title;
  } else if (ev.sourceType === "follow_up") {
    headline = stripTitlePrefix(ev.title, "Follow-up");
  }

  const whereLine = meta?.subline?.trim() || null;

  let dueLine: { className: string; text: string } | null = null;
  if (ev.sourceType === "follow_up") {
    const due = new Date(ev.start);
    if (!Number.isNaN(due.getTime())) dueLine = followUpDueLine(due, referenceNow);
  }

  const taskOverdue =
    ev.sourceType === "task" &&
    !ev.allDay &&
    !Number.isNaN(new Date(ev.start).getTime()) &&
    referenceNow.getTime() > new Date(ev.start).getTime();

  const isClosingTxn = ev.sourceType === "transaction" && (meta?.kind === "closing" || meta?.milestoneKind === "closing");
  const isChecklistTxn = ev.sourceType === "transaction" && !isClosingTxn;

  const footer = (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {ev.sourceType === "task" ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={completing}
              className={cn(kpBtnPrimary, "gap-1.5")}
              onClick={() => void markTaskComplete()}
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Mark complete
            </Button>
            <Button variant="outline" size="sm" className={kpBtnSecondary} asChild>
              <Link href={ev.relatedRoute} onClick={() => onOpenChange(false)}>
                Open Task Pilot
                <ExternalLink className="ml-1 inline h-3.5 w-3.5 opacity-70" aria-hidden />
              </Link>
            </Button>
          </>
        ) : null}

        {ev.sourceType === "showing" ? (
          <Button size="sm" className={cn(kpBtnPrimary, "gap-1.5")} asChild>
            <Link href={ev.relatedRoute} onClick={() => onOpenChange(false)}>
              Open showing
              <ExternalLink className="h-3.5 w-3.5 opacity-90" aria-hidden />
            </Link>
          </Button>
        ) : null}

        {ev.sourceType === "follow_up" ? (
          <>
            <Button size="sm" className={cn(kpBtnPrimary, "gap-1.5")} asChild>
              <Link href={ev.relatedRoute} onClick={() => onOpenChange(false)}>
                Open contact
                <ExternalLink className="h-3.5 w-3.5 opacity-90" aria-hidden />
              </Link>
            </Button>
            <Button variant="outline" size="sm" className={kpBtnSecondary} asChild>
              <Link href="/showing-hq/follow-ups" onClick={() => onOpenChange(false)}>
                Follow-ups queue
              </Link>
            </Button>
          </>
        ) : null}

        {ev.sourceType === "transaction" ? (
          <Button size="sm" className={cn(kpBtnPrimary, "gap-1.5")} asChild>
            <Link href={ev.relatedRoute} onClick={() => onOpenChange(false)}>
              {isClosingTxn ? "Open transaction" : "Open transaction workspace"}
              <ExternalLink className="h-3.5 w-3.5 opacity-90" aria-hidden />
            </Link>
          </Button>
        ) : null}
      </div>
      <Button type="button" variant="outline" size="sm" className={kpBtnSecondary} onClick={() => onOpenChange(false)}>
        Close
      </Button>
    </div>
  );

  return (
    <BrandModal
      open={open}
      onOpenChange={onOpenChange}
      title={headline}
      description={description}
      descriptionClassName="text-[13px]"
      size="md"
      bodyClassName="pt-3"
      footer={footer}
    >
      <dl className="space-y-4 text-sm">
        <div className={CALLOUT}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">Source</p>
          <p className="mt-1 text-[13px] leading-snug text-kp-on-surface">
            <span className="font-medium">KeyPilot</span>
            <span className="text-kp-on-surface-muted">
              {" "}
              — scheduled here. Edit dates and details in the linked workspace so your calendar stays accurate.
            </span>
          </p>
        </div>

        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">When</dt>
          <dd className="mt-1 text-[13px] leading-snug text-kp-on-surface">{whenLine}</dd>
        </div>

        {meta?.googleOutbound ? (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">
              Google Calendar (outbound)
            </dt>
            <dd className="mt-1 space-y-2 text-[13px] leading-snug text-kp-on-surface-muted">
              {meta.googleOutbound.status === "SYNCED" ? (
                <>
                  <p>
                    <span className="text-kp-on-surface">Synced to Google.</span> Copy lives on{" "}
                    <span className="font-medium text-kp-on-surface">
                      {meta.googleOutbound.targetCalendarSummary?.trim() ||
                        meta.googleOutbound.googleCalendarId ||
                        "your selected calendar"}
                    </span>
                    {meta.googleOutbound.googleAccountEmail ? (
                      <span className="text-kp-on-surface-muted/90">
                        {" "}
                        · {meta.googleOutbound.googleAccountEmail}
                      </span>
                    ) : null}
                    .
                  </p>
                  {meta.googleOutbound.lastSyncedAt ? (
                    <p className="text-[12px] text-kp-on-surface-muted">
                      Last mirrored {new Date(meta.googleOutbound.lastSyncedAt).toLocaleString()}.
                    </p>
                  ) : null}
                  {meta.googleOutbound.openInGoogleUrl ? (
                    <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "gap-1.5")} asChild>
                      <a href={meta.googleOutbound.openInGoogleUrl} target="_blank" rel="noopener noreferrer">
                        Open in Google Calendar
                        <ExternalLink className="h-3.5 w-3.5 opacity-80" aria-hidden />
                      </a>
                    </Button>
                  ) : (
                    <p className="text-[12px] text-kp-on-surface-muted">
                      Open in Google becomes available after the event is mirrored (refresh if you just connected).
                    </p>
                  )}
                </>
              ) : meta.googleOutbound.status === "ERROR" ? (
                <div className="space-y-2">
                  <div className="rounded-lg border border-amber-800/25 bg-amber-500/10 px-3 py-2.5 dark:border-amber-200/20 dark:bg-amber-500/10">
                    <p className="flex items-start gap-2 text-kp-on-surface">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-800 dark:text-amber-200" aria-hidden />
                      <span>
                        <span className="font-medium">Could not mirror to Google.</span> KeyPilot is still correct —
                        update the item here.{" "}
                        {meta.googleOutbound.lastError ? (
                          <span className="block mt-1.5 text-[12px] font-normal text-kp-on-surface-muted">
                            {meta.googleOutbound.lastError}
                          </span>
                        ) : null}
                      </span>
                    </p>
                    {meta.googleOutbound.targetCalendarSummary || meta.googleOutbound.googleCalendarId ? (
                      <p className="mt-2 text-[12px] text-kp-on-surface-muted">
                        Target:{" "}
                        <span className="font-medium text-kp-on-surface">
                          {meta.googleOutbound.targetCalendarSummary?.trim() ||
                            meta.googleOutbound.googleCalendarId ||
                            "selected calendar"}
                        </span>
                        {meta.googleOutbound.googleAccountEmail ? (
                          <span> · {meta.googleOutbound.googleAccountEmail}</span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={retryingOutbound}
                      className={cn(kpBtnSecondary, "gap-1.5")}
                      onClick={() => void retryOutboundSync()}
                    >
                      {retryingOutbound ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : null}
                      {retryingOutbound ? "Retrying…" : "Retry sync to Google"}
                    </Button>
                    <Button variant="outline" size="sm" className={kpBtnSecondary} asChild>
                      <Link href="/settings/connections" onClick={() => onOpenChange(false)}>
                        Calendar settings
                        <ExternalLink className="ml-1 inline h-3.5 w-3.5 opacity-70" aria-hidden />
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <p>
                  Sync to Google is pending for{" "}
                  <span className="font-medium text-kp-on-surface">
                    {meta.googleOutbound.targetCalendarSummary?.trim() ||
                      meta.googleOutbound.googleCalendarId ||
                      "your selected calendar"}
                  </span>
                  .
                </p>
              )}
            </dd>
          </div>
        ) : null}

        {taskOverdue ? (
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">Past due — complete or reschedule in Task Pilot.</p>
        ) : null}

        {ev.sourceType === "follow_up" && dueLine ? (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">Follow-up</dt>
            <dd className={cn("mt-1 text-[13px] leading-snug", dueLine.className)}>{dueLine.text}</dd>
          </div>
        ) : null}

        {meta?.contactName && ev.sourceType === "follow_up" ? (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">Contact</dt>
            <dd className="mt-1 text-[13px] font-medium leading-snug text-kp-on-surface">{meta.contactName}</dd>
          </div>
        ) : null}

        {whereLine ? (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-muted">
              {ev.sourceType === "follow_up" ? "Context" : ev.sourceType === "transaction" ? "Property" : "Where"}
            </dt>
            <dd className="mt-1 text-[13px] leading-snug text-kp-on-surface">{whereLine}</dd>
          </div>
        ) : null}

        {isChecklistTxn ? (
          <p className={CALLOUT}>Opens TransactionHQ on the pipeline workspace; the checklist item is due on this date.</p>
        ) : null}

        {isClosingTxn ? (
          <p className={CALLOUT}>Closing date for this transaction — confirm timing and documents in TransactionHQ.</p>
        ) : null}
      </dl>
    </BrandModal>
  );
}

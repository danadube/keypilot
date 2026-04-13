"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import type { CalendarEvent } from "@/lib/calendar/calendar-event-types";
import {
  formatCalendarWhenForDetail,
  localDateKey,
} from "@/lib/calendar/calendar-event-day-utils";

type InternalMeta = {
  subline?: string;
  workspace?: string;
  contactName?: string;
  taskPlainTitle?: string | null;
  milestoneKind?: string;
  kind?: string;
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
}: {
  ev: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCompleted?: () => void | Promise<void>;
}) {
  const [completing, setCompleting] = useState(false);

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
    <div className="flex flex-wrap items-center justify-between gap-2">
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
      size="md"
      footer={footer}
    >
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-kp-on-surface-muted">When</dt>
          <dd className="mt-0.5 text-kp-on-surface">{whenLine}</dd>
        </div>

        {taskOverdue ? (
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">Past due — complete or reschedule in Task Pilot.</p>
        ) : null}

        {ev.sourceType === "follow_up" && dueLine ? (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-kp-on-surface-muted">Follow-up</dt>
            <dd className={cn("mt-0.5", dueLine.className)}>{dueLine.text}</dd>
          </div>
        ) : null}

        {meta?.contactName && ev.sourceType === "follow_up" ? (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-kp-on-surface-muted">Contact</dt>
            <dd className="mt-0.5 font-medium text-kp-on-surface">{meta.contactName}</dd>
          </div>
        ) : null}

        {whereLine ? (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-kp-on-surface-muted">
              {ev.sourceType === "follow_up" ? "Context" : ev.sourceType === "transaction" ? "Property" : "Where"}
            </dt>
            <dd className="mt-0.5 text-kp-on-surface">{whereLine}</dd>
          </div>
        ) : null}

        {isChecklistTxn ? (
          <p className="rounded-md border border-kp-outline/50 bg-kp-bg/80 px-2.5 py-2 text-xs text-kp-on-surface-muted">
            Opens TransactionHQ on the pipeline workspace; your checklist item is due on this date.
          </p>
        ) : null}

        {isClosingTxn ? (
          <p className="rounded-md border border-kp-outline/50 bg-kp-bg/80 px-2.5 py-2 text-xs text-kp-on-surface-muted">
            Closing date for this transaction — confirm timing and documents in TransactionHQ.
          </p>
        ) : null}
      </dl>
    </BrandModal>
  );
}

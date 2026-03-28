"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Radio,
  Copy,
  CheckSquare,
  MessageSquare,
  Mail,
  FileText,
  Calendar,
  ChevronRight,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  kpBtnPrimary,
  kpBtnSecondary,
  kpBtnTertiary,
} from "@/components/ui/kp-dashboard-button-tiers";
import type { ScheduleItem } from "@/components/showing-hq/TodaysScheduleCard";

export type WorkbenchOpenHouse = {
  id: string;
  title: string;
  startAt: string;
  status: string;
  qrSlug?: string;
  property: { address1: string | null; city: string; state: string };
};

type ShowingHQWorkbenchQueueProps = {
  activeOpenHouse: WorkbenchOpenHouse | null;
  scheduledTodayOpenHouse: WorkbenchOpenHouse | null;
  signInUrl: string | null;
  linkCopied: boolean;
  onCopySignIn: (url: string) => () => void;
  followUpDraftCount: number;
  firstFollowUpDraftId: string | null;
  feedbackPendingCount: number;
  buyerAgentEmailDraftCount?: number;
  firstBuyerAgentDraftShowingId?: string | null;
  reportsReadyCount: number;
  firstReportId: string | null;
  scheduleItems: ScheduleItem[];
  tomorrowItem: ScheduleItem | null;
  formatTime: (iso: string) => string;
  formatDateShort: (iso: string) => string;
};

function Row({
  icon: Icon,
  tone,
  title,
  meta,
  actions,
}: {
  icon: typeof Radio;
  tone: "live" | "warn" | "neutral" | "schedule";
  title: string;
  meta?: string;
  actions: ReactNode;
}) {
  const border =
    tone === "live"
      ? "border-l-emerald-500"
      : tone === "warn"
        ? "border-l-amber-500"
        : tone === "schedule"
          ? "border-l-sky-500"
          : "border-l-kp-outline";
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-2 border-b border-kp-outline py-2.5 pl-3 last:border-b-0 ${border} border-l-[3px]`}
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-kp-on-surface">
          <Icon className="h-3.5 w-3.5 shrink-0 text-[#4BAED8]" />
          <span className="truncate">{title}</span>
        </p>
        {meta ? <p className="mt-0.5 pl-5 text-[11px] text-kp-on-surface-variant">{meta}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1">{actions}</div>
    </div>
  );
}

export function ShowingHQWorkbenchQueue({
  activeOpenHouse,
  scheduledTodayOpenHouse,
  signInUrl,
  linkCopied,
  onCopySignIn,
  followUpDraftCount,
  firstFollowUpDraftId,
  feedbackPendingCount,
  buyerAgentEmailDraftCount = 0,
  firstBuyerAgentDraftShowingId = null,
  reportsReadyCount,
  firstReportId,
  scheduleItems,
  tomorrowItem,
  formatTime,
  formatDateShort,
}: ShowingHQWorkbenchQueueProps) {
  const ohForSignIn = activeOpenHouse ?? scheduledTodayOpenHouse;
  const addr = ohForSignIn?.property?.address1 ?? "";

  return (
    <div
      className="flex min-h-0 flex-col rounded-lg border border-kp-outline bg-kp-surface"
      data-workbench-card
    >
      <div className="border-b border-kp-outline bg-kp-surface-high px-3 py-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-kp-on-surface">
          Today&apos;s queue
        </h2>
        <p className="mt-0.5 text-[11px] font-medium text-kp-on-surface-variant">
          Now · scheduled · waiting for review
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-1">
        {activeOpenHouse ? (
          <Row
            icon={Radio}
            tone="live"
            title="Active sign-in"
            meta={activeOpenHouse.property.address1 ?? undefined}
            actions={
              <>
                {signInUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(kpBtnSecondary, "h-7 gap-1 px-2 text-[11px]")}
                    onClick={onCopySignIn(signInUrl)}
                  >
                    {linkCopied ? (
                      <CheckSquare className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {linkCopied ? "Copied" : "Copy link"}
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(kpBtnPrimary, "h-7 border-transparent px-2 text-[11px]")}
                  asChild
                >
                  <Link href={`/showing-hq/open-houses/${activeOpenHouse.id}`}>Host</Link>
                </Button>
              </>
            }
          />
        ) : signInUrl && ohForSignIn ? (
          <Row
            icon={Radio}
            tone="neutral"
            title="Sign-in page ready"
            meta={addr}
            actions={
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(kpBtnSecondary, "h-7 gap-1 px-2 text-[11px]")}
                  onClick={onCopySignIn(signInUrl)}
                >
                  {linkCopied ? <CheckSquare className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {linkCopied ? "Copied" : "Copy"}
                </Button>
                <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-7 px-2 text-[11px]")} asChild>
                  <Link href={`/showing-hq/open-houses/${ohForSignIn.id}`}>Open house</Link>
                </Button>
              </>
            }
          />
        ) : null}

        {followUpDraftCount > 0 ? (
          <Row
            icon={CheckSquare}
            tone="warn"
            title={`Review ${followUpDraftCount} follow-up draft${followUpDraftCount === 1 ? "" : "s"}`}
            meta="Visitors waiting on your message"
            actions={
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "h-7 px-2 text-[11px]")}
                asChild
              >
                <Link
                  href={
                    firstFollowUpDraftId
                      ? `/showing-hq/follow-ups/draft/${firstFollowUpDraftId}`
                      : "/showing-hq/follow-ups"
                  }
                >
                  Review <ChevronRight className="ml-0.5 h-3 w-3" />
                </Link>
              </Button>
            }
          />
        ) : null}

        {buyerAgentEmailDraftCount > 0 ? (
          <Row
            icon={Mail}
            tone="warn"
            title={`${buyerAgentEmailDraftCount} feedback email draft${buyerAgentEmailDraftCount === 1 ? "" : "s"} ready`}
            meta="Past showings — review and send from your mail app"
            actions={
              <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-7 px-2 text-[11px]")} asChild>
                <Link
                  href={
                    firstBuyerAgentDraftShowingId
                      ? `/showing-hq/showings?openShowing=${encodeURIComponent(firstBuyerAgentDraftShowingId)}`
                      : "/showing-hq/showings?buyerAgentDraftReview=true"
                  }
                >
                  Review <ChevronRight className="ml-0.5 h-3 w-3" />
                </Link>
              </Button>
            }
          />
        ) : null}

        {feedbackPendingCount > 0 ? (
          <Row
            icon={MessageSquare}
            tone="warn"
            title={`${feedbackPendingCount} feedback request${feedbackPendingCount === 1 ? "" : "s"} pending`}
            meta="Seller feedback links to send"
            actions={
              <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-7 px-2 text-[11px]")} asChild>
                <Link href="/showing-hq/feedback-requests">Queue</Link>
              </Button>
            }
          />
        ) : null}

        {reportsReadyCount > 0 ? (
          <Row
            icon={FileText}
            tone="neutral"
            title={`${reportsReadyCount} seller report${reportsReadyCount === 1 ? "" : "s"} ready`}
            actions={
              <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-7 px-2 text-[11px]")} asChild>
                <Link
                  href={firstReportId ? `/open-houses/${firstReportId}/report` : "/open-houses"}
                >
                  View
                </Link>
              </Button>
            }
          />
        ) : null}

        {scheduleItems.length > 0 ? (
          <div className="border-b border-kp-outline py-2 pl-3">
            <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-variant">
              <Sun className="h-3 w-3" />
              On the calendar today
            </p>
            <ul className="space-y-1">
              {scheduleItems.slice(0, 8).map((s) => (
                <li key={`${s.type}-${s.id}`} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="min-w-0 truncate text-kp-on-surface-variant">
                    <span className="font-medium text-kp-on-surface">{formatTime(s.at)}</span>
                    <span className="opacity-50"> · </span>
                    {s.type === "open_house" ? "OH" : "Showing"}{" "}
                    <span className="text-kp-on-surface-variant">{s.property?.address1 ?? s.title}</span>
                    {s.type === "open_house" && s.readinessLabel ? (
                      <span className="text-kp-on-surface-variant/80">
                        {" "}
                        · {s.readinessLabel}
                      </span>
                    ) : null}
                  </span>
                  <Link
                    href={
                      s.type === "open_house"
                        ? `/showing-hq/open-houses/${s.id}`
                        : "/showing-hq/showings"
                    }
                    className="shrink-0 text-[#4BAED8] hover:underline"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tomorrowItem ? (
          <Row
            icon={Calendar}
            tone="schedule"
            title="Prep tomorrow"
            meta={`${formatDateShort(tomorrowItem.at)} · ${formatTime(tomorrowItem.at)} · ${tomorrowItem.property?.address1 ?? tomorrowItem.title}`}
            actions={
              <Button variant="ghost" size="sm" className={cn(kpBtnTertiary, "h-7 px-2 text-[11px]")} asChild>
                <Link
                  href={
                    tomorrowItem.type === "open_house"
                      ? `/showing-hq/open-houses/${tomorrowItem.id}`
                      : "/showing-hq/showings"
                  }
                >
                  Details
                </Link>
              </Button>
            }
          />
        ) : null}

        {!activeOpenHouse &&
        !signInUrl &&
        followUpDraftCount === 0 &&
        buyerAgentEmailDraftCount === 0 &&
        feedbackPendingCount === 0 &&
        reportsReadyCount === 0 &&
        scheduleItems.length === 0 &&
        !tomorrowItem ? (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-kp-on-surface-variant">Nothing queued. Add an open house or showing.</p>
            <div className="mt-3 flex justify-center gap-2">
              <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-7 text-xs")} asChild>
                <Link href="/properties/new">New property</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnPrimary, "h-7 border-transparent text-xs")}
                asChild
              >
                <Link href="/open-houses/new">Create open house</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

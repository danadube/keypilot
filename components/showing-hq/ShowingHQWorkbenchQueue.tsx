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
  Clock,
  ClipboardList,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  kpBtnPrimary,
  kpBtnSecondary,
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

const queueBtn = cn(kpBtnSecondary, "h-8 gap-1 px-3 text-xs font-medium");
const queueBtnPrimary = cn(kpBtnPrimary, "h-8 border-transparent px-3 text-xs font-medium");

type ShowingHQWorkbenchQueueProps = {
  activeOpenHouse: WorkbenchOpenHouse | null;
  scheduledTodayOpenHouse: WorkbenchOpenHouse | null;
  signInUrl: string | null;
  linkCopied: boolean;
  onCopySignIn: (url: string) => () => void;
  /** Today’s open house that still needs prep (flyer/agent). */
  prepNeededOpenHouse: WorkbenchOpenHouse | null;
  /** Next calendar item today starting within the soon window. */
  showingSoonItem: ScheduleItem | null;
  formatTime: (iso: string) => string;
  followUpDraftCount: number;
  firstFollowUpDraftId: string | null;
  feedbackPendingCount: number;
  buyerAgentEmailDraftCount?: number;
  firstBuyerAgentDraftShowingId?: string | null;
  reportsReadyCount: number;
  firstReportId: string | null;
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
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>
    </div>
  );
}

export function ShowingHQWorkbenchQueue({
  activeOpenHouse,
  scheduledTodayOpenHouse,
  signInUrl,
  linkCopied,
  onCopySignIn,
  prepNeededOpenHouse,
  showingSoonItem,
  formatTime,
  followUpDraftCount,
  firstFollowUpDraftId,
  feedbackPendingCount,
  buyerAgentEmailDraftCount = 0,
  firstBuyerAgentDraftShowingId = null,
  reportsReadyCount,
  firstReportId,
}: ShowingHQWorkbenchQueueProps) {
  const ohForSignIn = activeOpenHouse ?? scheduledTodayOpenHouse;
  const addr = ohForSignIn?.property?.address1 ?? "";

  const hasImmediateRow =
    !!activeOpenHouse ||
    !!(signInUrl && ohForSignIn) ||
    !!prepNeededOpenHouse ||
    !!showingSoonItem ||
    followUpDraftCount > 0 ||
    buyerAgentEmailDraftCount > 0 ||
    feedbackPendingCount > 0 ||
    reportsReadyCount > 0;

  return (
    <div
      className="flex min-h-[400px] flex-col rounded-xl border border-kp-outline bg-kp-surface lg:min-h-[460px]"
      data-workbench-card
    >
      <div className="border-b border-kp-outline bg-kp-surface-high px-3 py-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-kp-on-surface">
          Today&apos;s queue
        </h2>
        <p className="mt-0.5 text-[11px] font-medium text-kp-on-surface-variant">
          Immediate actions only — calendar and prep live above
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
                    className={queueBtn}
                    onClick={onCopySignIn(signInUrl)}
                  >
                    {linkCopied ? (
                      <CheckSquare className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {linkCopied ? "Copied" : "Copy link"}
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" className={queueBtnPrimary} asChild>
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
            meta={addr || undefined}
            actions={
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={queueBtn}
                  onClick={onCopySignIn(signInUrl)}
                >
                  {linkCopied ? <CheckSquare className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {linkCopied ? "Copied" : "Copy link"}
                </Button>
                <Button variant="outline" size="sm" className={queueBtn} asChild>
                  <Link href={`/showing-hq/open-houses/${ohForSignIn.id}`}>Open house</Link>
                </Button>
              </>
            }
          />
        ) : null}

        {prepNeededOpenHouse &&
        !(activeOpenHouse && activeOpenHouse.id === prepNeededOpenHouse.id) ? (
          <Row
            icon={ClipboardList}
            tone="warn"
            title="Prep needed"
            meta={prepNeededOpenHouse.property.address1 ?? prepNeededOpenHouse.title}
            actions={
              <Button variant="outline" size="sm" className={queueBtn} asChild>
                <Link href={`/showing-hq/open-houses/${prepNeededOpenHouse.id}`}>Open house</Link>
              </Button>
            }
          />
        ) : null}

        {showingSoonItem ? (
          <Row
            icon={Clock}
            tone="schedule"
            title="Showing soon"
            meta={`${formatTime(showingSoonItem.at)} · ${showingSoonItem.property?.address1 ?? showingSoonItem.title}`}
            actions={
              <Button variant="outline" size="sm" className={queueBtn} asChild>
                <Link
                  href={
                    showingSoonItem.type === "open_house"
                      ? `/showing-hq/open-houses/${showingSoonItem.id}`
                      : `/showing-hq/showings?openShowing=${encodeURIComponent(showingSoonItem.id)}`
                  }
                >
                  Open
                </Link>
              </Button>
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
              <Button variant="outline" size="sm" className={queueBtn} asChild>
                <Link
                  href={
                    firstFollowUpDraftId
                      ? `/showing-hq/follow-ups/draft/${firstFollowUpDraftId}`
                      : "/showing-hq/follow-ups"
                  }
                >
                  Review <ChevronRight className="h-3.5 w-3.5" />
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
              <Button variant="outline" size="sm" className={queueBtn} asChild>
                <Link
                  href={
                    firstBuyerAgentDraftShowingId
                      ? `/showing-hq/showings?openShowing=${encodeURIComponent(firstBuyerAgentDraftShowingId)}`
                      : "/showing-hq/showings?buyerAgentDraftReview=true"
                  }
                >
                  Review <ChevronRight className="h-3.5 w-3.5" />
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
              <Button variant="outline" size="sm" className={queueBtn} asChild>
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
              <Button variant="outline" size="sm" className={queueBtn} asChild>
                <Link
                  href={firstReportId ? `/open-houses/${firstReportId}/report` : "/open-houses"}
                >
                  View
                </Link>
              </Button>
            }
          />
        ) : null}

        {!hasImmediateRow ? (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-kp-on-surface-variant">
              Nothing needs action right now. Use Needs attention, Upcoming, and Schedule for what&apos;s next.
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <Button variant="outline" size="sm" className={queueBtn} asChild>
                <Link href="/properties/new">New property</Link>
              </Button>
              <Button variant="outline" size="sm" className={queueBtnPrimary} asChild>
                <Link href="/open-houses/new">Create open house</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

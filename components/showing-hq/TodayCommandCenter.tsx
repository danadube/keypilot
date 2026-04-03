"use client";

import Link from "next/link";
import {
  Home,
  QrCode,
  Copy,
  Calendar,
  Users,
  CheckSquare,
  MessageSquare,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandButton } from "@/components/ui/BrandButton";
import { cn } from "@/lib/utils";
import { kpBtnSecondary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { getRelativeTimeLabel } from "@/lib/relative-time-label";
import { showingWorkflowTabHref } from "@/lib/showing-hq/showing-workflow-hrefs";

type OpenHouseItem = {
  id: string;
  title: string;
  startAt: string;
  endAt?: string;
  status: string;
  qrSlug?: string;
  property: { address1: string; city: string; state: string };
  _count: { visitors: number };
};

type ScheduleItem = {
  type: "open_house" | "showing";
  id: string;
  at: string;
  property: { address1: string };
};

type TodayCommandCenterProps = {
  activeOpenHouse: OpenHouseItem | null;
  nextOpenHouse: OpenHouseItem | null;
  nextShowing: ScheduleItem | null;
  followUpCount: number;
  visitorsToday: number;
  feedbackRequestsPending: number;
  signInUrl: string | null;
  formatTime: (d: string) => string;
  onCopyLink: (url: string) => () => void;
  linkCopied: boolean;
};

type Scenario =
  | "showing_soon"
  | "active_oh"
  | "oh_soon"
  | "visitors_captured"
  | "feedback_pending"
  | "nothing";

export function TodayCommandCenter({
  activeOpenHouse,
  nextOpenHouse,
  nextShowing,
  followUpCount,
  visitorsToday,
  feedbackRequestsPending,
  signInUrl,
  formatTime,
  onCopyLink,
  linkCopied,
}: TodayCommandCenterProps) {
  const now = new Date();

  const showingMins = nextShowing
    ? Math.round((new Date(nextShowing.at).getTime() - now.getTime()) / 60000)
    : null;
  const ohMins = nextOpenHouse
    ? Math.round((new Date(nextOpenHouse.startAt).getTime() - now.getTime()) / 60000)
    : null;

  // Single primary state in priority order
  const scenario: Scenario =
    nextShowing && showingMins !== null && showingMins <= 30
      ? "showing_soon"
      : activeOpenHouse
        ? "active_oh"
        : nextOpenHouse && ohMins !== null && ohMins > 0 && ohMins <= 60
          ? "oh_soon"
          : visitorsToday > 0 && followUpCount === 0
            ? "visitors_captured"
            : feedbackRequestsPending > 0
              ? "feedback_pending"
              : "nothing";

  const primaryOh = activeOpenHouse ?? nextOpenHouse;

  let heading: string;
  let address: string | null = null;
  let supportingLine: string | null = null;

  switch (scenario) {
    case "showing_soon":
      heading =
        nextShowing && showingMins !== null && showingMins <= 30
          ? `Showing ${getRelativeTimeLabel(nextShowing.at)}`
          : nextShowing
            ? `Showing at ${formatTime(nextShowing.at)}`
            : "Showing soon";
      address = nextShowing?.property.address1 ?? null;
      break;
    case "active_oh":
      heading = "Open House Live";
      address = primaryOh?.property.address1 ?? null;
      supportingLine = primaryOh
        ? getRelativeTimeLabel(primaryOh.startAt, primaryOh.endAt)
        : null;
      break;
    case "oh_soon":
      heading =
        primaryOh && ohMins !== null && ohMins <= 60
          ? `Open house ${getRelativeTimeLabel(primaryOh.startAt, primaryOh.endAt)}`
          : primaryOh
            ? `Open house at ${formatTime(primaryOh.startAt)}`
            : "Open house soon";
      address = primaryOh?.property.address1 ?? null;
      break;
    case "visitors_captured":
      heading = `${visitorsToday} visitor${visitorsToday !== 1 ? "s" : ""} captured`;
      supportingLine = "Follow-up pending";
      break;
    case "feedback_pending":
      heading = "Feedback requests pending";
      supportingLine = `${feedbackRequestsPending} request${feedbackRequestsPending !== 1 ? "s" : ""} awaiting response`;
      break;
    default:
      heading = "You're all caught up";
      supportingLine = "No urgent items right now";
  }

  const containerClass =
    scenario === "showing_soon"
      ? "border-amber-400/60 bg-kp-surface"
      : scenario === "active_oh"
        ? "border-emerald-500/70 bg-kp-surface"
        : scenario === "oh_soon"
          ? "border-sky-400/60 bg-kp-surface"
          : "border-kp-outline bg-kp-surface";

  return (
    <section
      className={`rounded-lg border px-5 py-4 ${containerClass}`}
      role="region"
      aria-label="Today command center"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant"
            style={{ letterSpacing: "0.08em" }}
          >
            Now
          </p>
          <h2
            className="mt-0.5 text-lg font-bold tracking-tight text-kp-on-surface sm:text-xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {heading}
          </h2>
          {address && (
            <p className="mt-0.5 text-sm font-medium text-kp-on-surface">{address}</p>
          )}
          {supportingLine && (
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">{supportingLine}</p>
          )}
          {scenario === "active_oh" && (
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">
              {activeOpenHouse?._count.visitors === 0
                ? "No visitors yet"
                : `${activeOpenHouse?._count.visitors} visitor${activeOpenHouse?._count.visitors !== 1 ? "s" : ""} checked in`}
              {followUpCount > 0 &&
                ` · ${followUpCount} follow-up${followUpCount !== 1 ? "s" : ""} pending`}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {scenario === "showing_soon" && nextShowing && (
            <>
              <BrandButton variant="primary" size="sm" className="h-9" asChild>
                <Link href={showingWorkflowTabHref(nextShowing.id, "prep")}>
                  <Building2 className="mr-1.5 h-4 w-4" />
                  Open workspace
                </Link>
              </BrandButton>
              <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-9")} asChild>
                <Link href="/showing-hq/showings">All showings</Link>
              </Button>
            </>
          )}

          {scenario === "active_oh" && primaryOh && (
            <>
              <BrandButton variant="primary" size="sm" className="h-9" asChild>
                <Link href={`/open-houses/${primaryOh.id}/sign-in`}>
                  <QrCode className="mr-1.5 h-4 w-4" />
                  Host console
                </Link>
              </BrandButton>
              {signInUrl && (
                <BrandButton variant="secondary" size="sm" className="h-9" asChild>
                  <a href={signInUrl} target="_blank" rel="noopener noreferrer">
                    Visitor Sign-In
                  </a>
                </BrandButton>
              )}
              <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-9")} asChild>
                <Link href={`/open-houses/${primaryOh.id}/sign-in/print`}>
                  Print QR Poster
                </Link>
              </Button>
              {signInUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(kpBtnTertiary, "h-9")}
                  onClick={onCopyLink(signInUrl)}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  {linkCopied ? "Copied" : "Copy link"}
                </Button>
              )}
            </>
          )}

          {scenario === "oh_soon" && primaryOh && (
            <>
              <BrandButton variant="primary" size="sm" className="h-9" asChild>
                <Link href={`/open-houses/${primaryOh.id}/sign-in`}>
                  <QrCode className="mr-1.5 h-4 w-4" />
                  Host console
                </Link>
              </BrandButton>
              {signInUrl && (
                <BrandButton variant="secondary" size="sm" className="h-9" asChild>
                  <a href={signInUrl} target="_blank" rel="noopener noreferrer">
                    Visitor Sign-In
                  </a>
                </BrandButton>
              )}
              <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-9")} asChild>
                <Link href={`/open-houses/${primaryOh.id}/sign-in/print`}>
                  Print QR Poster
                </Link>
              </Button>
            </>
          )}

          {scenario === "visitors_captured" && (
            <>
              <BrandButton variant="primary" size="sm" className="h-9" asChild>
                <Link href="/showing-hq/visitors">
                  <Users className="mr-1.5 h-4 w-4" />
                  Review visitors
                </Link>
              </BrandButton>
              <BrandButton variant="secondary" size="sm" className="h-9" asChild>
                <Link href="/showing-hq/follow-ups">
                  <CheckSquare className="mr-1.5 h-4 w-4" />
                  Review follow-ups
                </Link>
              </BrandButton>
            </>
          )}

          {scenario === "feedback_pending" && (
            <>
              <BrandButton variant="primary" size="sm" className="h-9" asChild>
                <Link href="/showing-hq/feedback-requests">
                  <MessageSquare className="mr-1.5 h-4 w-4" />
                  Open feedback requests
                </Link>
              </BrandButton>
            </>
          )}

          {scenario === "nothing" && (
            <>
              <BrandButton variant="primary" size="sm" className="h-9" asChild>
                <Link href="/showing-hq/showings/new">
                  <Calendar className="mr-1.5 h-4 w-4" />
                  Add showing
                </Link>
              </BrandButton>
              <BrandButton variant="secondary" size="sm" className="h-9" asChild>
                <Link href="/open-houses/new">
                  <Home className="mr-1.5 h-4 w-4" />
                  Create open house
                </Link>
              </BrandButton>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

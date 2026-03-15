"use client";

import Link from "next/link";
import { Home, QrCode, Copy, Calendar } from "lucide-react";
import { BrandButton } from "@/components/ui/BrandButton";
import { Button } from "@/components/ui/button";

type OpenHouseItem = {
  id: string;
  title: string;
  startAt: string;
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
  /** Currently active (live) open house */
  activeOpenHouse: OpenHouseItem | null;
  /** Next upcoming open house today (not yet active) */
  nextOpenHouse: OpenHouseItem | null;
  /** Next upcoming showing today */
  nextShowing: ScheduleItem | null;
  followUpCount: number;
  signInUrl: string | null;
  formatTime: (d: string) => string;
  onCopyLink: (url: string) => () => void;
  linkCopied: boolean;
};

export function TodayCommandCenter({
  activeOpenHouse,
  nextOpenHouse,
  nextShowing,
  followUpCount,
  signInUrl,
  formatTime,
  onCopyLink,
  linkCopied,
}: TodayCommandCenterProps) {
  const now = new Date();

  // Scenario priority: active OH → upcoming OH (soon) → showing soon → nothing urgent
  const primaryOh = activeOpenHouse ?? nextOpenHouse;
  const ohMins = primaryOh && !activeOpenHouse
    ? Math.round((new Date(primaryOh.startAt).getTime() - now.getTime()) / 60000)
    : null;
  const showingMins = nextShowing
    ? Math.round((new Date(nextShowing.at).getTime() - now.getTime()) / 60000)
    : null;

  const isActiveOh = !!activeOpenHouse;
  const isUpcomingOh = !activeOpenHouse && primaryOh && ohMins !== null && ohMins > 0;
  const isShowingSoon = !primaryOh && nextShowing && showingMins !== null && showingMins <= 60;
  const isShowingLater = !primaryOh && nextShowing && showingMins !== null && showingMins > 60;

  const scenario: "active_oh" | "upcoming_oh" | "showing_soon" | "nothing" =
    isActiveOh ? "active_oh"
    : isUpcomingOh ? "upcoming_oh"
    : isShowingSoon ? "showing_soon"
    : isShowingLater ? "showing_soon"
    : "nothing";

  const heading =
    scenario === "active_oh" ? "Open House Live"
    : scenario === "upcoming_oh" ? (ohMins !== null && ohMins <= 60 ? `Open house starts in ${ohMins} min` : `Open house at ${primaryOh ? formatTime(primaryOh.startAt) : ""}`)
    : scenario === "showing_soon" ? (showingMins !== null && showingMins <= 30 ? `Showing starts in ${showingMins} min` : `Showing at ${nextShowing ? formatTime(nextShowing.at) : ""}`)
    : "You're all caught up";

  const address =
    scenario === "active_oh" || scenario === "upcoming_oh"
      ? primaryOh?.property.address1
      : scenario === "showing_soon"
        ? nextShowing?.property.address1
        : null;

  const supportingLine =
    scenario === "active_oh" && activeOpenHouse
      ? (activeOpenHouse._count.visitors === 0
          ? "No visitors yet"
          : `${activeOpenHouse._count.visitors} visitor${activeOpenHouse._count.visitors !== 1 ? "s" : ""} checked in`)
      : scenario === "active_oh" && followUpCount > 0
        ? "Follow-up pending"
        : scenario === "upcoming_oh"
          ? primaryOh?.property.address1
          : scenario === "showing_soon"
            ? nextShowing?.property.address1
            : scenario === "nothing"
              ? "No urgent items right now"
              : null;

  const containerClass =
    scenario === "active_oh"
      ? "border-emerald-500/60 bg-emerald-50/90 shadow-sm"
      : scenario === "upcoming_oh"
        ? "border-blue-400/50 bg-blue-50/80 shadow-sm"
        : scenario === "showing_soon"
          ? "border-amber-400/50 bg-amber-50/80 shadow-sm"
          : "border-slate-200 bg-slate-50/80 shadow-sm";

  return (
    <section
      className={`rounded-xl border-2 px-5 py-4 ${containerClass}`}
      role="region"
      aria-label="Today command center"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2
            className="text-base font-bold tracking-tight text-[var(--brand-text)] sm:text-lg"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {heading}
          </h2>
          {address && (
            <p className="mt-0.5 text-sm font-medium text-[var(--brand-text)]">
              {address}
            </p>
          )}
          {supportingLine && scenario !== "upcoming_oh" && scenario !== "showing_soon" && (
            <p className="mt-0.5 text-xs text-[var(--brand-text-muted)]">
              {supportingLine}
            </p>
          )}
          {scenario === "active_oh" && followUpCount > 0 && (
            <p className="mt-0.5 text-xs text-amber-700 font-medium">
              Follow-up pending
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {scenario === "active_oh" && primaryOh && (
            <>
              <BrandButton variant="primary" size="sm" className="h-9" asChild>
                <Link href={`/open-houses/${primaryOh.id}/sign-in`}>
                  <QrCode className="mr-1.5 h-4 w-4" />
                  Host Mode
                </Link>
              </BrandButton>
              {signInUrl && (
                <BrandButton variant="secondary" size="sm" className="h-9" asChild>
                  <a href={signInUrl} target="_blank" rel="noopener noreferrer">
                    Visitor Sign-In
                  </a>
                </BrandButton>
              )}
              <Button variant="outline" size="sm" className="h-9" asChild>
                <Link href={`/open-houses/${primaryOh.id}/sign-in/print`}>
                  Print QR Poster
                </Link>
              </Button>
              {signInUrl && (
                <Button variant="ghost" size="sm" className="h-9" onClick={onCopyLink(signInUrl)}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  {linkCopied ? "Copied" : "Copy link"}
                </Button>
              )}
            </>
          )}

          {scenario === "upcoming_oh" && primaryOh && (
            <>
              <BrandButton variant="primary" size="sm" className="h-9" asChild>
                <Link href={`/open-houses/${primaryOh.id}/sign-in`}>
                  <QrCode className="mr-1.5 h-4 w-4" />
                  Host Mode
                </Link>
              </BrandButton>
              {signInUrl && (
                <BrandButton variant="secondary" size="sm" className="h-9" asChild>
                  <a href={signInUrl} target="_blank" rel="noopener noreferrer">
                    Visitor Sign-In
                  </a>
                </BrandButton>
              )}
              <Button variant="outline" size="sm" className="h-9" asChild>
                <Link href={`/open-houses/${primaryOh.id}/sign-in/print`}>
                  Print QR Poster
                </Link>
              </Button>
            </>
          )}

          {scenario === "showing_soon" && (
            <>
              <BrandButton variant="primary" size="sm" className="h-9" asChild>
                <Link href="/showing-hq/showings">
                  View showing
                </Link>
              </BrandButton>
              <Button variant="outline" size="sm" className="h-9" asChild>
                <Link href="/showing-hq/showings">Reschedule</Link>
              </Button>
              <Button variant="outline" size="sm" className="h-9" asChild>
                <Link href="/showing-hq/feedback-requests">Request feedback</Link>
              </Button>
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

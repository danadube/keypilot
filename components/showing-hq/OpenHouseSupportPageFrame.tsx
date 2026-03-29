"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { showingHqOpenHouseWorkspaceHref } from "@/lib/showing-hq/showing-workflow-hrefs";
import { OPEN_HOUSE_BACK_TO_EVENT_LABEL } from "@/lib/showing-hq/open-house-support-constants";

type Props = {
  openHouseId: string;
  /** e.g. street or full address; shown under "ShowingHQ · Open house — …" */
  contextSubtitle?: string | null;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
  maxWidthClass?: "max-w-3xl" | "max-w-4xl";
  /** When false, omits outer padded card (use for pages that bring their own sections). */
  withContentCard?: boolean;
};

export function OpenHouseSupportPageFrame({
  openHouseId,
  contextSubtitle,
  children,
  className,
  headerRight,
  maxWidthClass = "max-w-4xl",
  withContentCard = true,
}: Props) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        maxWidthClass,
        className
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={showingHqOpenHouseWorkspaceHref(openHouseId)}
          className="text-sm font-medium text-kp-on-surface-variant transition-colors hover:text-kp-on-surface"
        >
          {OPEN_HOUSE_BACK_TO_EVENT_LABEL}
        </Link>
        {headerRight ?? null}
      </div>

      {contextSubtitle ? (
        <p className="mb-4 text-xs text-kp-on-surface-variant">
          <span className="font-semibold text-kp-on-surface">ShowingHQ</span>
          <span className="mx-1.5 text-kp-outline">·</span>
          <span>Open house — {contextSubtitle}</span>
        </p>
      ) : null}

      {withContentCard ? (
        <div className="rounded-2xl border border-kp-outline bg-kp-surface p-5 sm:p-6">
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

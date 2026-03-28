"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Radio, Copy, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";

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
};

function Row({
  icon: Icon,
  tone,
  title,
  meta,
  actions,
}: {
  icon: typeof Radio;
  tone: "live" | "neutral";
  title: string;
  meta?: string;
  actions: ReactNode;
}) {
  const border =
    tone === "live" ? "border-l-emerald-500" : "border-l-kp-outline";
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
}: ShowingHQWorkbenchQueueProps) {
  const ohForSignIn = activeOpenHouse ?? scheduledTodayOpenHouse;
  const addr = ohForSignIn?.property?.address1 ?? "";

  const hasRealtimeRow = !!activeOpenHouse || !!(signInUrl && ohForSignIn);

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
          Live sign-in only — planning and follow-ups are in Needs attention
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

        {!hasRealtimeRow ? (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-kp-on-surface-variant">
              No active open house right now. When a showing goes live, copy the sign-in link and host tools appear here.
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

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";

/**
 * Shown when user lands on /showing-hq?newShowing=<id> after scheduling.
 */
export function NewShowingScheduledBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("newShowing")?.trim();
  if (!id) return null;

  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-3 rounded-xl border border-emerald-400/35 bg-emerald-500/[0.12] px-4 py-3",
        "sm:flex-row sm:items-center sm:justify-between"
      )}
      role="status"
    >
      <p className="text-sm font-medium text-kp-on-surface">
        Showing scheduled — it&apos;s on your ShowingHQ workflow and Today.
      </p>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-8 text-xs")} asChild>
          <Link href={`/showing-hq/showings/${id}`}>Open workspace</Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(kpBtnTertiary, "h-8 text-xs")}
          onClick={() => router.replace("/showing-hq")}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

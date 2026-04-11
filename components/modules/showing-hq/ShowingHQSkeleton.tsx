import { BrandSkeleton } from "@/components/ui/BrandSkeleton";
import { cn } from "@/lib/utils";

/**
 * ShowingHQSkeleton — matches the ShowingHQ dashboard layout so the page
 * never shows a blank spinner while data loads.
 */
export function ShowingHQSkeleton() {
  return (
    <div className="relative flex min-h-0 w-full min-w-0 flex-col bg-transparent">
      <div className="flex flex-wrap items-end justify-between gap-3 pb-3">
        <div className="space-y-2">
          <BrandSkeleton className="h-6 w-40" />
          <BrandSkeleton className="h-3 w-64 max-w-full" />
        </div>
        <BrandSkeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Unified attention card */}
      <div className="rounded-xl border border-kp-outline/25 bg-kp-surface-high/[0.06] p-3 sm:p-4">
        <div className="flex justify-between gap-2">
          <BrandSkeleton className="h-5 w-52" />
          <BrandSkeleton className="h-8 w-32 rounded-lg" />
        </div>
        <div className="mt-3 space-y-2 border-t border-kp-outline/15 pt-3">
          <BrandSkeleton className="h-2.5 w-16" />
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-kp-outline/15 px-2 py-2"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <BrandSkeleton className="h-2.5 w-14" />
                <BrandSkeleton className="h-3.5 w-full max-w-sm" />
                <BrandSkeleton className="h-2.5 w-[72%] max-w-xs" />
              </div>
              <BrandSkeleton className="h-7 w-20 shrink-0 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Today — compact */}
      <div
        className={cn(
          "mt-4 rounded-lg border border-kp-outline/15 bg-kp-surface-high/[0.04] px-3 py-2.5",
          "space-y-2"
        )}
      >
        <div className="flex items-center gap-2">
          <BrandSkeleton className="h-3.5 w-3.5 rounded" />
          <BrandSkeleton className="h-3 w-16" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex justify-between gap-2">
            <BrandSkeleton className="h-2.5 w-24" />
            <BrandSkeleton className="h-2.5 w-40 max-w-[55%]" />
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3 border-t border-kp-outline/10 pt-5">
        <BrandSkeleton className="h-10 w-full max-w-lg rounded-md" />
        <BrandSkeleton className="h-12 w-full max-w-md" />
      </div>
    </div>
  );
}

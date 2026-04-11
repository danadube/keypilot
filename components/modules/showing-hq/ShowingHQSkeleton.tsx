import { BrandSkeleton } from "@/components/ui/BrandSkeleton";
import { cn } from "@/lib/utils";

/**
 * ShowingHQSkeleton — matches the ShowingHQ dashboard layout so the page
 * never shows a blank spinner while data loads.
 */
export function ShowingHQSkeleton() {
  return (
    <div className="flex min-h-0 w-full flex-col bg-transparent">
      {/* Page header row (title + actions live in layout; this mirrors content start) */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-3">
        <div className="space-y-2">
          <BrandSkeleton className="h-6 w-40" />
          <BrandSkeleton className="h-3 w-64 max-w-full" />
        </div>
        <BrandSkeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Zone 1 — attention */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <BrandSkeleton className="h-6 w-56" />
            <BrandSkeleton className="h-3 w-full max-w-md" />
          </div>
          <BrandSkeleton className="h-9 w-36 rounded-lg" />
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-kp-outline/20 bg-kp-surface-high/[0.06] px-3 py-3"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <BrandSkeleton className="h-3 w-20" />
              <BrandSkeleton className="h-4 w-[85%] max-w-md" />
              <BrandSkeleton className="h-3 w-[65%] max-w-sm" />
            </div>
            <BrandSkeleton className="h-8 w-24 shrink-0 rounded-md" />
          </div>
        ))}
      </div>

      {/* Zone 2 — today */}
      <div
        className={cn(
          "mt-6 rounded-xl border border-kp-outline/15 bg-kp-surface-high/[0.04] px-4 py-4",
          "space-y-4"
        )}
      >
        <div className="flex items-start gap-2">
          <BrandSkeleton className="h-4 w-4 shrink-0 rounded" />
          <div className="space-y-2">
            <BrandSkeleton className="h-4 w-24" />
            <BrandSkeleton className="h-3 w-52 max-w-full" />
          </div>
        </div>
        <BrandSkeleton className="h-3 w-28" />
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <BrandSkeleton className="h-3 w-14" />
            <BrandSkeleton className="h-3 flex-1" />
          </div>
        ))}
        <div className="border-t border-kp-outline/15 pt-4">
          <BrandSkeleton className="h-3 w-32" />
          {[0, 1].map((i) => (
            <div key={i} className="mt-2 flex gap-2">
              <BrandSkeleton className="h-3 w-40" />
              <BrandSkeleton className="h-3 flex-1" />
            </div>
          ))}
        </div>
      </div>

      {/* Zone 3 — support */}
      <div className="mt-6 space-y-4 border-t border-kp-outline/10 pt-6">
        <div className="rounded-xl border border-kp-outline/20 bg-kp-surface-high/[0.06] p-4">
          <BrandSkeleton className="h-4 w-40" />
          <BrandSkeleton className="mt-2 h-3 w-full max-w-sm" />
        </div>
        <BrandSkeleton className="h-3 w-36" />
        <BrandSkeleton className="h-16 w-full max-w-lg rounded-lg" />
      </div>
    </div>
  );
}

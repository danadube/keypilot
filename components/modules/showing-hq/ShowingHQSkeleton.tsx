import { BrandSkeleton } from "@/components/ui/BrandSkeleton";
import { cn } from "@/lib/utils";

/**
 * ShowingHQSkeleton — matches the ShowingHQ dashboard layout so the page
 * never shows a blank spinner while data loads.
 */
export function ShowingHQSkeleton() {
  return (
    <div className="flex min-h-0 w-full flex-col bg-transparent">
      {/* Command strip */}
      <div className="flex items-center justify-between rounded-xl border border-kp-outline bg-kp-surface px-5 py-4">
        <div className="flex flex-col gap-1.5">
          <BrandSkeleton className="h-4 w-48" />
          <BrandSkeleton className="h-3 w-32" />
        </div>
        <div className="flex gap-2">
          <BrandSkeleton className="h-8 w-28 rounded-lg" />
          <BrandSkeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>

      {/* Metrics strip */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:mt-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-kp-outline bg-kp-surface px-4 py-3.5">
            <BrandSkeleton className="mb-2 h-3 w-24" />
            <BrandSkeleton className="h-7 w-12" />
          </div>
        ))}
      </div>

      {/* Two-column grid */}
      <div
        className={cn(
          "mt-9 grid grid-cols-1 gap-6 sm:mt-10",
          "lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,1fr)] lg:items-start lg:gap-x-8"
        )}
      >
        {/* Left column — attention items */}
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
            <BrandSkeleton className="mb-4 h-5 w-44" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-kp-outline last:border-0">
                <BrandSkeleton className="h-8 w-8 shrink-0 rounded-lg" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <BrandSkeleton className="h-3.5 w-3/4" />
                  <BrandSkeleton className="h-3 w-1/2" />
                </div>
                <BrandSkeleton className="h-6 w-16 rounded-full shrink-0" />
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
            <BrandSkeleton className="mb-4 h-5 w-36" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-kp-outline last:border-0">
                <BrandSkeleton className="h-8 w-8 shrink-0 rounded-lg" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <BrandSkeleton className="h-3.5 w-2/3" />
                  <BrandSkeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — schedule + actions */}
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
            <BrandSkeleton className="mb-3 h-4 w-28" />
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <BrandSkeleton className="h-6 w-12 shrink-0" />
                <BrandSkeleton className="h-3.5 flex-1" />
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
            <BrandSkeleton className="mb-3 h-4 w-24" />
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <BrandSkeleton key={i} className="h-9 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { BrandSkeleton } from "@/components/ui/BrandSkeleton";

/**
 * DashboardSkeleton — matches the DashboardHome layout exactly so the page
 * never shows a blank spinner while data loads.
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--space-lg)]">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <BrandSkeleton className="h-7 w-32" />
        <div className="flex gap-2">
          <BrandSkeleton className="h-8 w-28" />
          <BrandSkeleton className="h-8 w-36" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-[var(--space-md)] sm:grid-cols-2 md:grid-cols-3 -mt-[var(--space-sm)]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-[var(--space-sm)]">
            <BrandSkeleton className="h-24 w-full rounded-xl" />
            <BrandSkeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      {/* Recent open houses card */}
      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        <BrandSkeleton className="mb-1 h-5 w-44" />
        <BrandSkeleton className="mb-5 h-3.5 w-56" />
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-kp-outline p-4"
            >
              <div className="flex flex-col gap-1.5">
                <BrandSkeleton className="h-4 w-48" />
                <BrandSkeleton className="h-3 w-32" />
              </div>
              <div className="flex items-center gap-3">
                <BrandSkeleton className="h-5 w-16 rounded-full" />
                <BrandSkeleton className="h-3.5 w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { BrandSkeleton } from "@/components/ui/BrandSkeleton";

export default function TransactionDetailLoading() {
  return (
    <div className="min-h-full rounded-2xl bg-kp-bg pb-10">
      <div className="pt-2">
        <BrandSkeleton className="h-4 w-28" />
        <BrandSkeleton className="mt-4 h-8 w-64 max-w-full" />
        <BrandSkeleton className="mt-2 h-4 w-full max-w-md" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(260px,320px)_1fr_minmax(260px,320px)]">
        <BrandSkeleton className="h-72 w-full rounded-xl" />
        <div className="flex min-h-[320px] flex-col gap-4">
          <BrandSkeleton className="h-24 w-full rounded-xl" />
          <BrandSkeleton className="h-24 w-full rounded-xl" />
          <BrandSkeleton className="h-40 w-full rounded-xl" />
        </div>
        <BrandSkeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

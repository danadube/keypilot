import { Suspense } from "react";
import { PageLoading } from "@/components/shared/PageLoading";
import { ShowingDetailWorkflow } from "@/components/modules/showing-hq/showing-detail-workflow";

export default function ShowingHqShowingDetailPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading…" />}>
      <div className="mx-auto max-w-3xl px-6 py-6 sm:px-8">
        <ShowingDetailWorkflow />
      </div>
    </Suspense>
  );
}

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/PageLoading";
import { OpenHouseDetailPageClient } from "./OpenHouseDetailPageClient";

export default function ShowingHQOpenHouseDetailPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading open house..." />}>
      <div className="mx-auto max-w-3xl px-6 py-6 sm:px-8">
        <OpenHouseDetailPageClient />
      </div>
    </Suspense>
  );
}

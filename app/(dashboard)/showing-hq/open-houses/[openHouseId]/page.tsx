import { Suspense } from "react";
import { PageLoading } from "@/components/shared/PageLoading";
import { OpenHouseDetailPageClient } from "./OpenHouseDetailPageClient";

export default function ShowingHQOpenHouseDetailPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading open house..." />}>
      <OpenHouseDetailPageClient />
    </Suspense>
  );
}

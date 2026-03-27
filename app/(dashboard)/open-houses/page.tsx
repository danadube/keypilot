// Phase 1 migration: new dark premium UI layer is now active.
// The previous component (OpenHousesList) is preserved at
// components/open-houses/OpenHousesList.tsx — revert by swapping the import.
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { OpenHousesListView } from "@/components/modules/open-houses/open-houses-list-view";

function OpenHousesListFallback() {
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-2xl bg-kp-bg">
      <Loader2
        className="h-6 w-6 animate-spin text-kp-on-surface-variant"
        aria-label="Loading open houses"
      />
    </div>
  );
}

export default function OpenHousesPage() {
  return (
    <Suspense fallback={<OpenHousesListFallback />}>
      <OpenHousesListView />
    </Suspense>
  );
}

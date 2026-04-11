import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { DealsListView } from "@/components/modules/deals/deals-list-view";

function ListFallback() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-2xl bg-kp-bg">
      <Loader2 className="h-6 w-6 animate-spin text-kp-on-surface-variant" aria-label="Loading" />
    </div>
  );
}

export default function DealsPage() {
  return (
    <Suspense fallback={<ListFallback />}>
      <DealsListView />
    </Suspense>
  );
}

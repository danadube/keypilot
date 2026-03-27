import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ShowingsListView } from "@/components/modules/showing-hq/showings-list-view";

function ShowingsListFallback() {
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-2xl bg-kp-bg">
      <Loader2
        className="h-6 w-6 animate-spin text-kp-on-surface-variant"
        aria-label="Loading showings"
      />
    </div>
  );
}

export default function ShowingsPage() {
  return (
    <Suspense fallback={<ShowingsListFallback />}>
      <ShowingsListView />
    </Suspense>
  );
}

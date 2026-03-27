import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { VisitorsListView } from "@/components/modules/showing-hq/visitors-list-view";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";

function VisitorsListFallback() {
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-kp-outline bg-kp-surface">
      <Loader2
        className="h-6 w-6 animate-spin text-kp-on-surface-variant"
        aria-label="Loading visitors"
      />
    </div>
  );
}

export default function ShowingHQVisitorsPage() {
  return (
    <div className="flex flex-col gap-4">
      <DashboardContextStrip message="Review open house visitors, search leads, and connect sign-ins to contacts." />
      <Suspense fallback={<VisitorsListFallback />}>
        <VisitorsListView />
      </Suspense>
    </div>
  );
}

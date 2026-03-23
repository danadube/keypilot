import { VisitorsListView } from "@/components/modules/showing-hq/visitors-list-view";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";

export default function ShowingHQVisitorsPage() {
  return (
    <div className="flex flex-col gap-4">
      <DashboardContextStrip message="Review open house visitors, search leads, and connect sign-ins to contacts." />
      <VisitorsListView />
    </div>
  );
}

import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";
import { ActivityTemplatesView } from "@/components/modules/showing-hq/activity-templates-view";

export default function ShowingHQTemplatesPage() {
  return (
    <div className="flex flex-col gap-4">
      <DashboardContextStrip message="Reusable patterns for activity titles and descriptions. One-click “apply template” when creating an activity is coming next." />
      <ActivityTemplatesView />
    </div>
  );
}

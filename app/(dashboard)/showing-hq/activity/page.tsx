import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";
import { UserActivitiesView } from "@/components/modules/showing-hq/user-activities-view";

export default function ShowingHQActivityPage() {
  return (
    <div className="flex flex-col gap-4">
      <DashboardContextStrip message="Your CRM activity list—same data as Command Center’s recent feed and ClientKeep. Use templates to prefill recurring follow-ups; open-house event timelines stay on the home dashboard." />
      <UserActivitiesView />
    </div>
  );
}

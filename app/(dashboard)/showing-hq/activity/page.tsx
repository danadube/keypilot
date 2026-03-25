import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";
import { UserActivitiesView } from "@/components/modules/showing-hq/user-activities-view";

export default function ShowingHQActivityPage() {
  return (
    <div className="flex flex-col gap-4">
      <DashboardContextStrip message="Your tasks and follow-ups—calls, emails, notes, showings, and more. (Open-house timeline items stay on the dashboard home feed.)" />
      <UserActivitiesView />
    </div>
  );
}

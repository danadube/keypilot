import { FollowUpTasksView } from "@/components/modules/showing-hq/follow-up-tasks-view";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";

export default function ShowingHQFollowUpsPage() {
  return (
    <div className="flex flex-col gap-4">
      <DashboardContextStrip message="Your active follow-up tasks — overdue, due today, and coming up. One canonical list across all open houses and showings." />
      <FollowUpTasksView />
    </div>
  );
}

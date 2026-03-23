import { FollowUpsView } from "@/components/modules/showing-hq/follow-ups-view";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";

export default function ShowingHQFollowUpsPage() {
  return (
    <div className="flex flex-col gap-4">
      <DashboardContextStrip message="Suggested tasks, email follow-ups, and reminders tied to open houses and showings." />
      <FollowUpsView />
    </div>
  );
}

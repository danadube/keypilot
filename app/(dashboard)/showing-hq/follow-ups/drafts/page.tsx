import { FollowUpsView } from "@/components/modules/showing-hq/follow-ups-view";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";

export default function ShowingHQEmailDraftsPage() {
  return (
    <div className="flex flex-col gap-4">
      <DashboardContextStrip message="AI-generated email drafts for open house visitors, plus call reminders. Separate from your follow-up task queue." />
      <FollowUpsView />
    </div>
  );
}

import { FollowUpTasksView } from "@/components/modules/showing-hq/follow-up-tasks-view";
import { ShowingHqPageHeader } from "@/components/modules/showing-hq/showing-hq-page-header";

export default function ShowingHQFollowUpsPage() {
  return (
    <div className="flex flex-col gap-4">
      <ShowingHqPageHeader
        title="Follow-ups"
        subtitle="Active tasks — overdue, due today, and coming up across open houses and showings."
      />
      <FollowUpTasksView />
    </div>
  );
}

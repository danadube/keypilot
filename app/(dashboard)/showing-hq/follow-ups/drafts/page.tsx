import { FollowUpsView } from "@/components/modules/showing-hq/follow-ups-view";
import { ShowingHqPageHeader } from "@/components/modules/showing-hq/showing-hq-page-header";

export default function ShowingHQEmailDraftsPage() {
  return (
    <div className="flex flex-col gap-4">
      <ShowingHqPageHeader />
      <FollowUpsView />
    </div>
  );
}

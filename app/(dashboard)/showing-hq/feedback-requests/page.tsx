import { FeedbackRequestsView } from "@/components/modules/showing-hq/feedback-requests-view";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";

export default function FeedbackRequestsPage() {
  return (
    <div className="flex flex-col gap-4">
      <DashboardContextStrip message="Private showing feedback — share the link with the buyer agent to capture quick responses." />
      <FeedbackRequestsView />
    </div>
  );
}

import { FeedbackRequestsView } from "@/components/modules/showing-hq/feedback-requests-view";

export default function FeedbackRequestsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-kp-on-surface">Feedback Requests</h1>
        <p className="mt-1 text-sm text-kp-on-surface-variant">
          Private showing feedback — share the link with the buyer agent to capture quick feedback.
        </p>
      </div>
      <FeedbackRequestsView />
    </div>
  );
}

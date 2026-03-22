import { FollowUpsView } from "@/components/modules/showing-hq/follow-ups-view";

export default function ShowingHQFollowUpsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-kp-on-surface">Follow-ups</h1>
        <p className="mt-1 text-sm text-kp-on-surface-variant">
          AI suggested tasks, email follow-ups, and call reminders.
        </p>
      </div>
      <FollowUpsView />
    </div>
  );
}

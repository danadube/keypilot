import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";
import { SupraInboxView } from "@/components/modules/showing-hq/supra-inbox-view";

export default function SupraInboxPage() {
  return (
    <div className="flex flex-col gap-4">
      <DashboardContextStrip message="Paste real Supra emails from your inbox to test end-to-end (no Gmail API yet). Review, run the stub parser if useful, then Apply to create or update property and showing." />
      <SupraInboxView />
    </div>
  );
}

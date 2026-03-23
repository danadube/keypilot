import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";
import { SupraInboxView } from "@/components/modules/showing-hq/supra-inbox-view";

export default function SupraInboxPage() {
  return (
    <div className="flex flex-col gap-4">
      <DashboardContextStrip message="Review Supra notifications before any showing or property is created. Ingestion and parsing will connect here next." />
      <SupraInboxView />
    </div>
  );
}

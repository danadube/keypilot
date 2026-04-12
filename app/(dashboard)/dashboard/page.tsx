import type { Metadata } from "next";
import { OperationalDashboardView } from "@/components/dashboard/operational-dashboard-view";

export const metadata: Metadata = {
  title: "Command center | KeyPilot",
  description:
    "Execution-focused home: urgent deals, pipeline snapshot, today's schedule, priority tasks, and listings.",
};

export default function DashboardPage() {
  return <OperationalDashboardView />;
}

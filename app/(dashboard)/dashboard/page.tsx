import type { Metadata } from "next";
import { OperationalDashboardView } from "@/components/dashboard/operational-dashboard-view";

export const metadata: Metadata = {
  title: "Dashboard | KeyPilot",
  description:
    "Operational home — today's work, pipeline snapshot, quick actions, and module shortcuts.",
};

export default function DashboardPage() {
  return <OperationalDashboardView />;
}

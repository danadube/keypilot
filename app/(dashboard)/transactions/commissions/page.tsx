import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commissions | Transactions | KeyPilot",
  description: "Commission tracking per transaction.",
};

export default function TransactionsCommissionsPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Commission Tracking</h1>
      <p className="text-muted-foreground">Coming soon.</p>
    </div>
  );
}

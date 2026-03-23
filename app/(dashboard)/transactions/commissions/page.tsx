import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commissions | Transactions | KeyPilot",
  description: "Commission tracking per transaction.",
};

export default function TransactionsCommissionsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-xl font-bold text-kp-on-surface">Commission Tracking</h1>
      <p className="text-sm text-kp-on-surface-variant">Coming soon.</p>
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Closing Pipeline | Transactions | KeyPilot",
  description: "Transaction closing pipeline.",
};

export default function TransactionsPipelinePage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-xl font-bold text-kp-on-surface">Closing Pipeline</h1>
      <p className="text-sm text-kp-on-surface-variant">Coming soon.</p>
    </div>
  );
}

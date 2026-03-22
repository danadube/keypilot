import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";

export const metadata: Metadata = {
  title: "Transactions | KeyPilot",
  description: "Transaction pipeline and commission tracking.",
};

export default function TransactionsOverviewPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-kp-on-surface">Transactions</h1>
        <p className="mt-1 text-sm text-kp-on-surface-variant">
          Closing pipeline, commission tracking, and deal management. Coming soon.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-kp-outline p-12 text-center">
        <LayoutDashboard className="h-12 w-12 text-kp-on-surface-variant" />
        <h2 className="mt-4 text-lg font-semibold text-kp-on-surface">Module in development</h2>
        <p className="mt-2 max-w-sm text-sm text-kp-on-surface-variant">
          Transaction pipeline, commission tracking, and closing stages will be available in a future release.
        </p>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";

export const metadata: Metadata = {
  title: "Transactions | KeyPilot",
  description: "Transaction pipeline and commission tracking.",
};

export default function TransactionsOverviewPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <p className="mt-1 text-muted-foreground">
          Closing pipeline, commission tracking, and deal management. Coming soon.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <LayoutDashboard className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-medium">Module in development</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Transaction pipeline, commission tracking, and closing stages will be available in a future release.
        </p>
      </div>
    </div>
  );
}

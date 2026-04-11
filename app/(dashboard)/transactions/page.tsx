import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { TransactionsListView } from "@/components/modules/transactions/transactions-list-view";

export const metadata: Metadata = {
  title: "TransactionHQ | KeyPilot",
  description:
    "Operational transaction management—net commission, status, deal context, and high-level production view.",
};

function TransactionsListFallback() {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-2xl bg-kp-bg">
      <Loader2
        className="h-6 w-6 animate-spin text-kp-on-surface-variant"
        aria-label="Loading transactions"
      />
    </div>
  );
}

export default function TransactionsOverviewPage() {
  return (
    <Suspense fallback={<TransactionsListFallback />}>
      <TransactionsListView />
    </Suspense>
  );
}

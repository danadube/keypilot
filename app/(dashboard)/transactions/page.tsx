import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { TransactionsListView } from "@/components/modules/transactions/transactions-list-view";

export const metadata: Metadata = {
  title: "Production | Transactions | KeyPilot",
  description: "Value-first production list: net commission, status, and deal context.",
};

function ListFallback() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-2xl bg-kp-bg">
      <Loader2 className="h-6 w-6 animate-spin text-kp-on-surface-variant" aria-label="Loading" />
    </div>
  );
}

export default function TransactionsOverviewPage() {
  return (
    <Suspense fallback={<ListFallback />}>
      <TransactionsListView />
    </Suspense>
  );
}

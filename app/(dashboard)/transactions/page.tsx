import type { Metadata } from "next";
import { TransactionsListView } from "@/components/modules/transactions/transactions-list-view";

export const metadata: Metadata = {
  title: "Production | Transactions | KeyPilot",
  description: "Value-first production list: net commission, status, and deal context.",
};

export default function TransactionsOverviewPage() {
  return <TransactionsListView />;
}

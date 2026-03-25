import type { Metadata } from "next";
import { TransactionsListView } from "@/components/modules/transactions/transactions-list-view";

export const metadata: Metadata = {
  title: "Transactions | KeyPilot",
  description: "Transaction pipeline and commission tracking.",
};

export default function TransactionsOverviewPage() {
  return <TransactionsListView />;
}

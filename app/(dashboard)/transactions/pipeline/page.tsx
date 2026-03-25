import type { Metadata } from "next";
import { TransactionsPipelineView } from "@/components/modules/transactions/transactions-pipeline-view";

export const metadata: Metadata = {
  title: "Closing Pipeline | Transactions | KeyPilot",
  description: "Transaction closing pipeline.",
};

export default function TransactionsPipelinePage() {
  return <TransactionsPipelineView />;
}

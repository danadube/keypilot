import type { Metadata } from "next";
import { TransactionFinancialWorkspace } from "@/components/modules/transactions/transaction-financial-workspace";

export const metadata: Metadata = {
  title: "Financial & records | Transaction | KeyPilot",
  description:
    "Edit transaction economics, pipeline record, CRM deal link, and commission splits.",
};

export default async function TransactionFinancialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TransactionFinancialWorkspace transactionId={id} />;
}

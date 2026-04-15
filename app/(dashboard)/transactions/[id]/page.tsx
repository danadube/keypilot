import type { Metadata } from "next";
import { TransactionDetailView } from "@/components/modules/transactions/transaction-detail-view";

export const metadata: Metadata = {
  title: "Transaction | KeyPilot",
  description:
    "Transaction workspace — property, milestones, commissions, optional CRM deal link, and lifecycle.",
};

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TransactionDetailView transactionId={id} />;
}

import { TransactionDetailView } from "@/components/modules/transactions/transaction-detail-view";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TransactionDetailView transactionId={id} />;
}

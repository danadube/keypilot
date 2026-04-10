import type { TransactionSignals } from "@/lib/transactions/transaction-signals";

export type TransactionAttentionItem = {
  transactionId: string;
  href: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  primaryLine: string;
  signals: TransactionSignals;
};

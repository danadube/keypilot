import { TransactionsModuleShell } from "@/components/transactions/transactions-module-shell";

export default function TransactionsLayout({ children }: { children: React.ReactNode }) {
  return <TransactionsModuleShell>{children}</TransactionsModuleShell>;
}

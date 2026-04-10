import { TransactionsModuleShell } from "@/components/transactions/transactions-module-shell";
import { TransactionsWorkspaceChrome } from "@/components/transactions/transactions-workspace-chrome";

export default function TransactionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <TransactionsModuleShell>
      <TransactionsWorkspaceChrome>{children}</TransactionsWorkspaceChrome>
    </TransactionsModuleShell>
  );
}

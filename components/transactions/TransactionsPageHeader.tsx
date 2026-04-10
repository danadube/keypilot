import type { ReactNode } from "react";
import { TransactionsModuleHeader } from "./transactions-module-header";

const DEFAULT_SUBTITLE =
  "Closings, sale details, commission splits, and lifecycle state";

export interface TransactionsPageHeaderProps {
  /** Secondary line under the title */
  subtitle?: string;
  /** Primary actions (e.g. add transaction) */
  actions?: ReactNode;
  className?: string;
}

/**
 * @deprecated Prefer {@link TransactionsModuleHeader} for full module chrome (tabs + layout).
 * This wrapper keeps a stable title of "Transactions" and includes the shared tabs.
 */
export function TransactionsPageHeader({
  subtitle = DEFAULT_SUBTITLE,
  actions,
  className,
}: TransactionsPageHeaderProps) {
  return (
    <TransactionsModuleHeader
      title="Transactions"
      subtitle={subtitle}
      actions={actions}
      className={className}
    />
  );
}

import type { ReactNode } from "react";
import {
  TRANSACTION_HQ_MODULE_TITLE,
  TransactionsModuleHeader,
} from "./transactions-module-header";

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
 * Wraps TransactionHQ chrome with a stable default subtitle.
 */
export function TransactionsPageHeader({
  subtitle = DEFAULT_SUBTITLE,
  actions,
  className,
}: TransactionsPageHeaderProps) {
  return (
    <TransactionsModuleHeader
      title={TRANSACTION_HQ_MODULE_TITLE}
      subtitle={subtitle}
      actions={actions}
      className={className}
    />
  );
}

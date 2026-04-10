import type { ReactNode } from "react";
import { TransactionsModuleHeader } from "./transactions-module-header";

const DEFAULT_SUBTITLE =
  "Closings, sale details, commission splits, and lifecycle state";

export interface TransactionsPageHeaderProps {
  /** Secondary line under the shell title */
  subtitle?: string;
  /** Primary actions (e.g. add transaction) */
  actions?: ReactNode;
  className?: string;
}

/**
 * @deprecated Prefer {@link TransactionsModuleHeader} for page context (subtitle + actions).
 */
export function TransactionsPageHeader({
  subtitle = DEFAULT_SUBTITLE,
  actions,
  className,
}: TransactionsPageHeaderProps) {
  return (
    <TransactionsModuleHeader subtitle={subtitle} actions={actions} className={className} />
  );
}

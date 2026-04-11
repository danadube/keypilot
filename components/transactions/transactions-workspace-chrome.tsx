"use client";

import {
  KP_WORKSPACE_CHROME_BODY_GUTTER_CLASS,
  KP_WORKSPACE_CHROME_HEADER_GUTTER_CLASS,
} from "@/lib/shell/workspace-chrome-gutter";
import { TransactionHqPageHeader } from "@/components/platform/transaction-hq-page-header";

/**
 * TransactionHQ workspace: {@link PageHeader} (Actions = section nav), then page body.
 */
export function TransactionsWorkspaceChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <div className={KP_WORKSPACE_CHROME_HEADER_GUTTER_CLASS}>
        <TransactionHqPageHeader className="pb-2 pt-0 md:pb-3" />
      </div>
      <div className={KP_WORKSPACE_CHROME_BODY_GUTTER_CLASS}>{children}</div>
    </div>
  );
}

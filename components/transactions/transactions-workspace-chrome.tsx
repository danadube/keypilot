"use client";

import { cn } from "@/lib/utils";
import {
  KP_WORKSPACE_CHROME_BODY_GUTTER_CLASS,
  KP_WORKSPACE_CHROME_HEADER_GUTTER_CLASS,
} from "@/lib/shell/workspace-chrome-gutter";
import { TransactionsModuleTabBar } from "./transactions-module-tab-bar";

/**
 * TransactionHQ workspace: module-level tabs + page body.
 * The dashboard shell supplies the primary "TransactionHQ" title (matches PropertyVault).
 */
export function TransactionsWorkspaceChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <header
        className={cn(
          "overflow-hidden rounded-lg border border-kp-outline-variant bg-kp-surface",
          KP_WORKSPACE_CHROME_HEADER_GUTTER_CLASS
        )}
      >
        <TransactionsModuleTabBar />
      </header>
      <div className={KP_WORKSPACE_CHROME_BODY_GUTTER_CLASS}>{children}</div>
    </div>
  );
}

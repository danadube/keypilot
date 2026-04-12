"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PageHeader,
  PageHeaderActionButton,
  PageHeaderActionItem,
  PageHeaderActionsMenu,
  pageHeaderPrimaryCtaLinkClass,
  PageHeaderPrimaryAddMenu,
} from "@/components/layout/PageHeader";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
import { useState } from "react";
import { useTransactionHqChromeOptional } from "@/components/modules/transactions/transaction-hq-chrome-context";

const DEFAULT_SUBTITLE =
  "Your closings and referrals — net commission and deal status at a glance.";

function subtitleForPath(pathname: string): string {
  const base = pathname.split("?")[0] ?? "";
  if (base.startsWith("/transactions/pipeline")) {
    return "Active pipeline by stage — closed deals stay on the overview.";
  }
  if (base.startsWith("/transactions/commissions")) {
    return "Commission lines assigned to you — open a deal for full context.";
  }
  return DEFAULT_SUBTITLE;
}

export type TransactionHqPageHeaderProps = {
  className?: string;
};

function isTransactionDetailShellPath(base: string): boolean {
  const path = base.split("?")[0] ?? "";
  // /transactions/[id] or /transactions/[id]/financial — no Workspace; single Add transaction CTA.
  return /^\/transactions\/[^/]+\/?$/.test(path) || /^\/transactions\/[^/]+\/financial\/?$/.test(path);
}

export function TransactionHqPageHeader({ className }: TransactionHqPageHeaderProps) {
  const pathname = usePathname() ?? "";
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const hqChrome = useTransactionHqChromeOptional();
  const detailShell = isTransactionDetailShellPath(pathname);

  return (
    <>
      <PageHeader
        className={className}
        title="TransactionHQ"
        subtitle={subtitleForPath(pathname)}
        actionsMenu={
          detailShell ? null : (
            <PageHeaderActionsMenu summaryLabel="Workspace">
              <PageHeaderActionItem href="/transactions">Overview</PageHeaderActionItem>
              <PageHeaderActionItem href="/transactions/pipeline">Pipeline</PageHeaderActionItem>
              <PageHeaderActionItem href="/transactions/commissions">Commissions</PageHeaderActionItem>
            </PageHeaderActionsMenu>
          )
        }
        secondaryActions={hqChrome?.detailActions ?? null}
        primaryAction={
          detailShell ? (
            <Link href="/transactions?new=1" className={pageHeaderPrimaryCtaLinkClass}>
              Add transaction
            </Link>
          ) : (
            <PageHeaderPrimaryAddMenu>
              <PageHeaderActionItem href="/transactions?new=1">New deal</PageHeaderActionItem>
              <PageHeaderActionButton type="button" onClick={() => setNewTaskOpen(true)}>
                New task
              </PageHeaderActionButton>
            </PageHeaderPrimaryAddMenu>
          )
        }
      />
      <NewTaskModal open={newTaskOpen} onOpenChange={setNewTaskOpen} />
    </>
  );
}

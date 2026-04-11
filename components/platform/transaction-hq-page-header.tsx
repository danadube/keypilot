"use client";

import { usePathname } from "next/navigation";
import {
  PageHeader,
  PageHeaderActionButton,
  PageHeaderActionItem,
  PageHeaderActionsMenu,
  PageHeaderPrimaryAddMenu,
} from "@/components/layout/PageHeader";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
import { useState } from "react";

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

export function TransactionHqPageHeader({ className }: TransactionHqPageHeaderProps) {
  const pathname = usePathname() ?? "";
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  return (
    <>
      <PageHeader
        className={className}
        title="TransactionHQ"
        subtitle={subtitleForPath(pathname)}
        actionsMenu={
          <PageHeaderActionsMenu>
            <PageHeaderActionItem href="/transactions">Overview</PageHeaderActionItem>
            <PageHeaderActionItem href="/transactions/pipeline">Pipeline</PageHeaderActionItem>
            <PageHeaderActionItem href="/transactions/commissions">Commissions</PageHeaderActionItem>
          </PageHeaderActionsMenu>
        }
        primaryAction={
          <PageHeaderPrimaryAddMenu>
            <PageHeaderActionItem href="/transactions?new=1">New deal</PageHeaderActionItem>
            <PageHeaderActionButton type="button" onClick={() => setNewTaskOpen(true)}>
              New task
            </PageHeaderActionButton>
          </PageHeaderPrimaryAddMenu>
        }
      />
      <NewTaskModal open={newTaskOpen} onOpenChange={setNewTaskOpen} />
    </>
  );
}

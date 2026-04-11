"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  PageHeader,
  PageHeaderActionButton,
  PageHeaderActionItem,
  PageHeaderActionsMenu,
  PageHeaderPrimaryAddMenu,
} from "@/components/layout/PageHeader";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
import { getShowingHqQuietViewLabel } from "@/components/modules/showing-hq/showing-hq-tabs";

export type ShowingHqPageHeaderProps = {
  className?: string;
};

function ActionsMenuGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none px-3 pb-0 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-muted">
      {children}
    </div>
  );
}

function ActionsMenuDivider() {
  return <div className="my-1 border-t border-kp-outline/50" role="separator" />;
}

/**
 * ShowingHQ page chrome: quiet view label, Actions (views + tools), and Add.
 * Creation flows live under Add; navigation under Actions.
 */
export function ShowingHqPageHeader({ className }: ShowingHqPageHeaderProps) {
  const pathname = usePathname() ?? "";
  const viewLabel = getShowingHqQuietViewLabel(pathname);
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);

  return (
    <>
      <PageHeader
        className={className}
        leading={
          <p className="text-[11px] font-medium text-kp-on-surface-muted md:text-xs">{viewLabel}</p>
        }
        actionsMenu={
          <PageHeaderActionsMenu>
            <ActionsMenuGroupLabel>Views</ActionsMenuGroupLabel>
            <PageHeaderActionItem href="/showing-hq">Overview</PageHeaderActionItem>
            <PageHeaderActionItem href="/showing-hq/showings">Showings</PageHeaderActionItem>
            <PageHeaderActionItem href="/open-houses">Open houses</PageHeaderActionItem>
            <PageHeaderActionItem href="/showing-hq/visitors">Visitors</PageHeaderActionItem>
            <PageHeaderActionItem href="/showing-hq/feedback-requests">Feedback</PageHeaderActionItem>
            <ActionsMenuDivider />
            <ActionsMenuGroupLabel>Tools</ActionsMenuGroupLabel>
            <PageHeaderActionItem href="/showing-hq/saved-views">Manage saved views</PageHeaderActionItem>
            <PageHeaderActionItem href="/showing-hq/supra-inbox">Supra inbox</PageHeaderActionItem>
            <PageHeaderActionItem href="/showing-hq/follow-ups/drafts">Review drafts</PageHeaderActionItem>
            <PageHeaderActionItem href="/open-houses/sign-in">Sign-in page</PageHeaderActionItem>
            <PageHeaderActionItem href="/showing-hq/analytics">Analytics</PageHeaderActionItem>
            <PageHeaderActionItem href="/showing-hq/activity">Activity</PageHeaderActionItem>
          </PageHeaderActionsMenu>
        }
        primaryAction={
          <PageHeaderPrimaryAddMenu>
            <PageHeaderActionItem href="/showing-hq/showings/new">New showing</PageHeaderActionItem>
            <PageHeaderActionItem href="/open-houses/new">New open house</PageHeaderActionItem>
            <PageHeaderActionButton type="button" onClick={() => setNewTaskModalOpen(true)}>
              New task
            </PageHeaderActionButton>
          </PageHeaderPrimaryAddMenu>
        }
      />
      <NewTaskModal open={newTaskModalOpen} onOpenChange={setNewTaskModalOpen} />
    </>
  );
}

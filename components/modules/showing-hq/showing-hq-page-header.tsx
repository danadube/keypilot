"use client";

import { useState } from "react";
import {
  PageHeader,
  PageHeaderActionButton,
  PageHeaderActionItem,
  PageHeaderActionsMenu,
  PageHeaderPrimaryAddMenu,
} from "@/components/layout/PageHeader";
import { NewTaskModal } from "@/components/tasks/new-task-modal";

export type ShowingHqPageHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
};

/**
 * Standard ShowingHQ page chrome: Actions + Add match the main dashboard pattern.
 * Creation flows live under Add; secondary navigation under Actions.
 */
export function ShowingHqPageHeader({ title, subtitle, className }: ShowingHqPageHeaderProps) {
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);

  return (
    <>
      <PageHeader
        className={className}
        title={title}
        subtitle={subtitle}
        actionsMenu={
          <PageHeaderActionsMenu>
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

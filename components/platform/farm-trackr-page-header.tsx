"use client";

import { useState } from "react";
import {
  PageHeader,
  PageHeaderActionButton,
  PageHeaderActionItem,
  PageHeaderActionsMenu,
  PageHeaderActionsMenuSeparator,
  PageHeaderPrimaryAddMenu,
} from "@/components/layout/PageHeader";
import { NewTaskModal } from "@/components/tasks/new-task-modal";

const DEFAULT_SUBTITLE = "Edit territories and farm areas—the structure your memberships attach to.";

export type FarmTrackrPageHeaderProps = {
  className?: string;
};

export function FarmTrackrPageHeader({ className }: FarmTrackrPageHeaderProps) {
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  return (
    <>
      <PageHeader
        className={className}
        title="FarmTrackr"
        subtitle={DEFAULT_SUBTITLE}
        actionsMenu={
          <PageHeaderActionsMenu>
            <PageHeaderActionItem href="/farm-trackr">Overview</PageHeaderActionItem>
            <PageHeaderActionItem href="/farm-trackr/farms">Farms</PageHeaderActionItem>
            <PageHeaderActionItem href="/farm-trackr/lists">Lists</PageHeaderActionItem>
            <PageHeaderActionItem href="/farm-trackr/performance">Performance</PageHeaderActionItem>
            <PageHeaderActionsMenuSeparator />
            <PageHeaderActionItem href="/farm-trackr?import=open">Imports</PageHeaderActionItem>
            <PageHeaderActionItem href="/farm-trackr?mailing=open">Mailing</PageHeaderActionItem>
            <PageHeaderActionItem href="/contacts">Contacts</PageHeaderActionItem>
          </PageHeaderActionsMenu>
        }
        primaryAction={
          <PageHeaderPrimaryAddMenu>
            <PageHeaderActionItem href="/farm-trackr?create=territory">New territory</PageHeaderActionItem>
            <PageHeaderActionItem href="/farm-trackr?create=area">New farm area</PageHeaderActionItem>
            <PageHeaderActionItem href="/contacts?new=1">New contact</PageHeaderActionItem>
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

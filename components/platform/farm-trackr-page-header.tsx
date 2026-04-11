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

const DEFAULT_SUBTITLE =
  "Define territories and farm areas—the structure for memberships, imports, and mailings.";

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
            <PageHeaderActionItem href="/farm-trackr#imports">Imports</PageHeaderActionItem>
            <PageHeaderActionItem href="/contacts">Contacts</PageHeaderActionItem>
          </PageHeaderActionsMenu>
        }
        primaryAction={
          <PageHeaderPrimaryAddMenu>
            <PageHeaderActionItem href="/farm-trackr#farm-trackr-create">
              New territory or area
            </PageHeaderActionItem>
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

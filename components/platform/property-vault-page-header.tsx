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

const DEFAULT_SUBTITLE = "Listing records, media, and open house readiness.";

export type PropertyVaultPageHeaderProps = {
  className?: string;
};

export function PropertyVaultPageHeader({ className }: PropertyVaultPageHeaderProps) {
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  return (
    <>
      <PageHeader
        className={className}
        title="PropertyVault"
        subtitle={DEFAULT_SUBTITLE}
        actionsMenu={
          <PageHeaderActionsMenu>
            <PageHeaderActionItem href="/property-vault/overview">Overview</PageHeaderActionItem>
            <PageHeaderActionItem href="/properties">Properties</PageHeaderActionItem>
            <PageHeaderActionItem href="/open-houses">Open houses</PageHeaderActionItem>
          </PageHeaderActionsMenu>
        }
        primaryAction={
          <PageHeaderPrimaryAddMenu>
            <PageHeaderActionItem href="/properties/new">Add property</PageHeaderActionItem>
            <PageHeaderActionItem href="/open-houses/new">New open house</PageHeaderActionItem>
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

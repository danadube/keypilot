"use client";

import {
  PageHeader,
  PageHeaderActionButton,
  PageHeaderActionItem,
  PageHeaderActionsMenu,
  PageHeaderPrimaryAddMenu,
} from "@/components/layout/PageHeader";

const DEFAULT_SUBTITLE = "Fast checks, due times, and priority — without leaving the list.";

export type TaskPilotPageHeaderProps = {
  className?: string;
  onNewTask: () => void;
};

export function TaskPilotPageHeader({ className, onNewTask }: TaskPilotPageHeaderProps) {
  return (
    <PageHeader
      className={className}
      title="TaskPilot"
      subtitle={DEFAULT_SUBTITLE}
      actionsMenu={
        <PageHeaderActionsMenu>
          <PageHeaderActionItem href="/dashboard">Command center</PageHeaderActionItem>
          <PageHeaderActionItem href="/showing-hq">ShowingHQ</PageHeaderActionItem>
        </PageHeaderActionsMenu>
      }
      primaryAction={
        <PageHeaderPrimaryAddMenu>
          <PageHeaderActionButton type="button" onClick={onNewTask}>
            New task
          </PageHeaderActionButton>
        </PageHeaderPrimaryAddMenu>
      }
    />
  );
}

"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  PageHeader,
  PageHeaderActionButton,
  PageHeaderActionItem,
  PageHeaderActionsMenu,
  PageHeaderActionsMenuSeparator,
  PageHeaderPrimaryAddMenu,
} from "@/components/layout/PageHeader";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
import { getPropertyIdFromPropertiesPathname } from "@/lib/property-vault/property-route-context";

const DEFAULT_SUBTITLE = "Listing records, media, and open house readiness.";

export type PropertyVaultPageHeaderProps = {
  className?: string;
};

export function PropertyVaultPageHeader({ className }: PropertyVaultPageHeaderProps) {
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const propertyId = getPropertyIdFromPropertiesPathname(pathname);

  return (
    <>
      <PageHeader
        className={className}
        title="PropertyVault"
        subtitle={DEFAULT_SUBTITLE}
        actionsMenu={
          <PageHeaderActionsMenu>
            {propertyId ? (
              <>
                <PageHeaderActionItem
                  href={`/properties/${propertyId}#property-workspace-hero`}
                >
                  Overview
                </PageHeaderActionItem>
                <PageHeaderActionItem href={`/properties/${propertyId}/documents`}>
                  Documents
                </PageHeaderActionItem>
                <PageHeaderActionItem href={`/properties/${propertyId}/media`}>
                  Photos &amp; media
                </PageHeaderActionItem>
                <PageHeaderActionsMenuSeparator />
              </>
            ) : null}
            <PageHeaderActionItem href="/property-vault/overview">Vault overview</PageHeaderActionItem>
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

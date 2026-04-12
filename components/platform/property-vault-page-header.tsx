"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PageHeader,
  PageHeaderActionButton,
  PageHeaderActionItem,
  PageHeaderActionsMenu,
  PageHeaderActionsMenuSeparator,
  pageHeaderPrimaryCtaLinkClass,
} from "@/components/layout/PageHeader";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
import { getPropertyIdFromPropertiesPathname } from "@/lib/property-vault/property-route-context";
import { usePropertyVaultDetailCommandApi } from "@/components/modules/properties/property-vault-detail-command-context";

const DEFAULT_SUBTITLE = "Listing records, media, and open house readiness.";

export type PropertyVaultPageHeaderProps = {
  className?: string;
};

export function PropertyVaultPageHeader({ className }: PropertyVaultPageHeaderProps) {
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const propertyId = getPropertyIdFromPropertiesPathname(pathname);
  const { detail } = usePropertyVaultDetailCommandApi();
  const detailForPage =
    detail && propertyId && detail.propertyId === propertyId ? detail : null;

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
                <PageHeaderActionItem href={`/properties/${propertyId}#property-workspace-hero`}>
                  Overview
                </PageHeaderActionItem>
                {detailForPage ? (
                  <PageHeaderActionButton
                    type="button"
                    onClick={() => detailForPage.onEdit()}
                  >
                    Edit property
                  </PageHeaderActionButton>
                ) : null}
                <PageHeaderActionItem href={`/properties/${propertyId}/documents`}>
                  Documents
                </PageHeaderActionItem>
                <PageHeaderActionItem href={`/properties/${propertyId}/media`}>
                  Photos &amp; media
                </PageHeaderActionItem>
                {detailForPage ? (
                  <PageHeaderActionButton type="button" onClick={() => detailForPage.onAddTask()}>
                    Add task
                  </PageHeaderActionButton>
                ) : (
                  <PageHeaderActionButton type="button" onClick={() => setNewTaskOpen(true)}>
                    Add task
                  </PageHeaderActionButton>
                )}
                <PageHeaderActionItem href="/open-houses/new">New open house</PageHeaderActionItem>
                {detailForPage ? (
                  <>
                    <PageHeaderActionsMenuSeparator />
                    <PageHeaderActionButton
                      type="button"
                      disabled={detailForPage.lifecycleBusy !== null}
                      onClick={() => detailForPage.onArchive()}
                    >
                      {detailForPage.lifecycleBusy === "archive" ? "Archiving…" : "Archive property"}
                    </PageHeaderActionButton>
                    <PageHeaderActionButton
                      type="button"
                      disabled={detailForPage.lifecycleBusy !== null}
                      onClick={() => detailForPage.onDelete()}
                    >
                      {detailForPage.lifecycleBusy === "delete" ? "Deleting…" : "Delete property"}
                    </PageHeaderActionButton>
                  </>
                ) : null}
                <PageHeaderActionsMenuSeparator />
              </>
            ) : null}
            <PageHeaderActionItem href="/property-vault/overview">Vault overview</PageHeaderActionItem>
            <PageHeaderActionItem href="/properties">Properties</PageHeaderActionItem>
            <PageHeaderActionItem href="/open-houses">Open houses</PageHeaderActionItem>
          </PageHeaderActionsMenu>
        }
        primaryAction={
          <Link href="/properties/new" className={pageHeaderPrimaryCtaLinkClass}>
            Add property
          </Link>
        }
      />
      <NewTaskModal open={newTaskOpen} onOpenChange={setNewTaskOpen} />
    </>
  );
}

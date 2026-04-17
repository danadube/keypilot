"use client";

import {
  KP_WORKSPACE_CHROME_BODY_GUTTER_CLASS,
  KP_WORKSPACE_CHROME_HEADER_GUTTER_CLASS,
} from "@/lib/shell/workspace-chrome-gutter";
import { ClientKeepChromeProvider } from "@/components/modules/client-keep/client-keep-chrome-context";
import { ClientKeepPageHeader } from "@/components/platform/client-keep-page-header";
import { ClientKeepViewNav } from "@/components/modules/client-keep/client-keep-view-nav";

/**
 * ClientKeep workspace: page header (actions + Add client), then left-aligned view nav, then body.
 * Wraps /client-keep/* and /contacts/*.
 */
export function ClientKeepWorkspaceChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientKeepChromeProvider>
      <div className="flex min-h-0 flex-col gap-1.5">
        <div className={KP_WORKSPACE_CHROME_HEADER_GUTTER_CLASS}>
          <ClientKeepPageHeader className="pb-2 pt-0 md:pb-3" />
          <ClientKeepViewNav className="mt-1" />
        </div>
        <div className={KP_WORKSPACE_CHROME_BODY_GUTTER_CLASS}>{children}</div>
      </div>
    </ClientKeepChromeProvider>
  );
}

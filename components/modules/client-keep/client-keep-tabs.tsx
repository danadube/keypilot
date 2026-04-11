"use client";

import {
  KP_WORKSPACE_CHROME_BODY_GUTTER_CLASS,
  KP_WORKSPACE_CHROME_HEADER_GUTTER_CLASS,
} from "@/lib/shell/workspace-chrome-gutter";
import { ClientKeepPageHeader } from "@/components/platform/client-keep-page-header";

export const CLIENT_KEEP_TAB_ITEMS = [
  { id: "contacts", label: "Contacts", href: "/contacts" },
  { id: "segments", label: "Segments", href: "/client-keep/segments" },
  { id: "follow-ups", label: "Follow-ups", href: "/client-keep/follow-ups" },
] as const;

export type ClientKeepTabId = (typeof CLIENT_KEEP_TAB_ITEMS)[number]["id"];

/**
 * Active workspace section for ClientKeep. Tags, communications hub, and other auxiliary
 * /client-keep/* routes (not primary sections) return null.
 */
export function getActiveClientKeepTabId(pathname: string): ClientKeepTabId | null {
  if (pathname.startsWith("/contacts")) return "contacts";
  if (pathname.startsWith("/client-keep/tags")) return "contacts";
  if (pathname.startsWith("/client-keep/segments")) return "segments";
  if (pathname.startsWith("/client-keep/follow-ups")) return "follow-ups";
  return null;
}

/**
 * ClientKeep workspace: {@link PageHeader} (Actions = section nav), then page body.
 * Wraps /client-keep/* and /contacts/*.
 */
export function ClientKeepWorkspaceChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <div className={KP_WORKSPACE_CHROME_HEADER_GUTTER_CLASS}>
        <ClientKeepPageHeader className="pb-2 pt-0 md:pb-3" />
      </div>
      <div className={KP_WORKSPACE_CHROME_BODY_GUTTER_CLASS}>{children}</div>
    </div>
  );
}

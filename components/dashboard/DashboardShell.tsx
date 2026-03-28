"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Building2, Calendar } from "lucide-react";
import { ProductTierProvider } from "@/components/ProductTierProvider";
import { ModuleSidebar } from "@/components/layout/ModuleSidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSave, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { shellTopRowHeightClass } from "@/lib/shell-top-bar";

function getPageTitle(pathname: string): string {
  if (pathname === "/showing-hq") return "ShowingHQ";
  if (pathname.startsWith("/showing-hq/showings/new")) return "Schedule Showing";
  if (pathname.startsWith("/showing-hq/showings")) return "Showings";
  if (pathname.startsWith("/showing-hq/visitors")) return "Visitors";
  if (pathname.startsWith("/showing-hq/follow-ups")) return "Follow-ups";
  if (pathname.startsWith("/showing-hq/supra-inbox")) return "Supra Inbox";
  if (pathname.startsWith("/showing-hq/feedback-requests")) return "Feedback Requests";
  if (pathname.startsWith("/showing-hq/activity")) return "Activity";
  if (pathname.startsWith("/showing-hq/templates")) return "Templates";
  if (pathname.startsWith("/open-houses/new")) return "New Open House";
  if (pathname === "/open-houses/sign-in") return "Sign-in & QR";
  if (/^\/open-houses\/[^/]+\/sign-in/.test(pathname)) return "Host sign-in";
  if (pathname.startsWith("/open-houses")) return "Open Houses";
  if (pathname.startsWith("/properties/new")) return "New Property";
  if (pathname.startsWith("/properties")) return "Properties";
  if (pathname === "/property-vault") return "Properties";
  if (pathname.startsWith("/property-vault")) return "PropertyVault";
  if (pathname.startsWith("/market-pilot/campaigns")) return "Campaigns";
  if (pathname.startsWith("/market-pilot")) return "MarketPilot";
  if (pathname.startsWith("/contacts")) return "Contacts";
  if (pathname.startsWith("/deals")) return "Deals";
  if (pathname.startsWith("/client-keep/activity")) return "Recent activity";
  if (pathname.startsWith("/client-keep/follow-ups")) return "Follow-ups";
  if (pathname.startsWith("/client-keep/communications")) return "Communications";
  if (pathname.startsWith("/client-keep/tags")) return "Tags";
  if (pathname.startsWith("/client-keep/segments")) return "Segments";
  if (pathname.startsWith("/client-keep")) return "ClientKeep";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname === "/") return "Overview";
  return "KeyPilot";
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isShowingHQWorkbench = pathname === "/showing-hq";
  const workbenchDateLine = React.useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    []
  );

  return (
    <ProductTierProvider>
    <div className="kp-dashboard-app flex min-h-screen bg-kp-bg">
      {/* Sidebar: full-height branded rail from top */}
      <ModuleSidebar />

      {/* Right: header bar + content */}
      <div className="flex min-h-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-20 flex w-full shrink-0 items-stretch border-b border-kp-outline bg-kp-surface",
            shellTopRowHeightClass(pathname)
          )}
        >
          <div className="flex min-w-0 flex-1 items-center overflow-hidden pl-4 pr-3 md:pl-6 md:pr-4">
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold leading-tight text-kp-on-surface md:text-base">
                {getPageTitle(pathname)}
              </h1>
              {isShowingHQWorkbench ? (
                <p className="mt-0.5 truncate text-[10px] leading-tight text-kp-on-surface-variant">
                  {workbenchDateLine}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 border-l border-kp-outline bg-kp-surface px-2.5 md:gap-2 md:px-3.5">
            {isShowingHQWorkbench ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    kpBtnSecondary,
                    "h-7 shrink-0 px-2.5 text-[11px] [&_svg]:h-3 [&_svg]:w-3"
                  )}
                  asChild
                >
                  <Link href="/properties/new">
                    <Building2 className="mr-1 h-3 w-3" />
                    New property
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    kpBtnSave,
                    "h-7 shrink-0 border-transparent px-2.5 text-[11px] [&_svg]:h-3 [&_svg]:w-3"
                  )}
                  asChild
                >
                  <Link href="/open-houses/new">
                    <Calendar className="mr-1 h-3 w-3" />
                    Create open house
                  </Link>
                </Button>
              </>
            ) : null}
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto bg-kp-bg px-4 pb-5 pt-2 md:px-6 md:pb-6 md:pt-3">
          <div className="mx-auto min-h-[50vh]" style={{ maxWidth: 1280 }}>
            {children}
          </div>
        </main>
      </div>
    </div>
    </ProductTierProvider>
  );
}

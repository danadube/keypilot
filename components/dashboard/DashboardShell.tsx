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

const HEADER_HEIGHT_DEFAULT = 64;
/** Align with ShowingHQ sidebar header block (~ pt-4 + title + tagline + pb-5) */
const HEADER_HEIGHT_SHOWING_HQ_WORKBENCH = 88;

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/showing-hq/showings/new")) return "Schedule Showing";
  if (pathname.startsWith("/showing-hq/showings")) return "Showings";
  if (pathname.startsWith("/showing-hq/visitors")) return "Visitors";
  if (pathname.startsWith("/showing-hq/follow-ups")) return "Follow-ups";
  if (pathname.startsWith("/showing-hq/supra-inbox")) return "Supra Inbox";
  if (pathname.startsWith("/showing-hq/feedback-requests")) return "Feedback Requests";
  if (pathname.startsWith("/showing-hq/activity")) return "Activity";
  if (pathname.startsWith("/showing-hq/templates")) return "Templates";
  if (pathname.startsWith("/open-houses/new")) return "New Open House";
  if (pathname.startsWith("/open-houses")) return "Open Houses";
  if (pathname.startsWith("/properties/new")) return "New Property";
  if (pathname.startsWith("/properties")) return "Properties";
  if (pathname.startsWith("/property-vault")) return "PropertyVault";
  if (pathname.startsWith("/contacts")) return "Contacts";
  if (pathname.startsWith("/deals")) return "Deals";
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
    <div className="flex min-h-screen bg-kp-bg">
      {/* Sidebar: full-height branded rail from top */}
      <ModuleSidebar />

      {/* Right: header bar + content */}
      <div className="flex min-h-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-20 flex w-full shrink-0 items-center border-b border-kp-outline bg-kp-surface"
          style={{
            minHeight: isShowingHQWorkbench
              ? HEADER_HEIGHT_SHOWING_HQ_WORKBENCH
              : HEADER_HEIGHT_DEFAULT,
          }}
        >
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center overflow-hidden pl-6 pr-4 md:pl-8 md:pr-6",
              isShowingHQWorkbench ? "py-2" : "h-full"
            )}
          >
            {isShowingHQWorkbench ? (
              <div className="min-w-0">
                <h1
                  className="truncate text-base font-bold leading-tight tracking-tight text-kp-on-surface md:text-lg"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  ShowingHQ Workbench
                </h1>
                <p className="mt-0.5 truncate text-[11px] leading-snug text-kp-on-surface-variant">
                  {workbenchDateLine}
                </p>
              </div>
            ) : (
              <h1 className="truncate text-base font-semibold text-kp-on-surface">
                {getPageTitle(pathname)}
              </h1>
            )}
          </div>
          <div
            className={cn(
              "flex shrink-0 items-center gap-2 border-l border-kp-outline bg-kp-surface px-3 py-2 md:gap-3 md:px-4",
              isShowingHQWorkbench ? "min-h-[88px]" : "min-h-[64px]"
            )}
          >
            {isShowingHQWorkbench ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high hover:text-kp-on-surface"
                  asChild
                >
                  <Link href="/properties/new">
                    <Building2 className="mr-1.5 h-3.5 w-3.5" />
                    New property
                  </Link>
                </Button>
                <Button
                  size="sm"
                  className="h-8 shrink-0 border-0 bg-kp-gold text-xs text-kp-bg hover:bg-kp-gold-bright"
                  asChild
                >
                  <Link href="/open-houses/new">
                    <Calendar className="mr-1.5 h-3.5 w-3.5" />
                    Create open house
                  </Link>
                </Button>
              </>
            ) : null}
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto bg-kp-bg p-8 md:p-10">
          <div className="mx-auto min-h-[50vh]" style={{ maxWidth: 1280 }}>
            {children}
          </div>
        </main>
      </div>
    </div>
    </ProductTierProvider>
  );
}

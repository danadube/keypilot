"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ProductTierProvider } from "@/components/ProductTierProvider";
import {
  DASHBOARD_SIDEBAR_WIDTH_PX,
  ModuleSidebar,
  SidebarContents,
} from "@/components/layout/ModuleSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { WorkspaceMainContextBar } from "@/components/dashboard/WorkspaceMainContextBar";
import { cn } from "@/lib/utils";
import { KP_APP_HEADER_HEIGHT_PX } from "@/lib/shell-top-bar";
import { isWorkspaceContext } from "@/lib/showing-hq/isShowingHQContext";

const MOBILE_DRAWER_TRANSITION_MS = 200;

function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [show, setShow] = React.useState(false);
  const [animate, setAnimate] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setShow(true);
      const raf = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setAnimate(false);
      const t = setTimeout(() => setShow(false), MOBILE_DRAWER_TRANSITION_MS);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!show) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[95] lg:hidden"
      style={{ top: `${KP_APP_HEADER_HEIGHT_PX}px` }}
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/60 transition-opacity duration-200",
          animate ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          "absolute left-0 top-0 flex h-full flex-col border-r border-kp-outline text-slate-100",
          "transition-transform duration-200",
          animate ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          width: DASHBOARD_SIDEBAR_WIDTH_PX,
          backgroundColor: "var(--brand-sidebar-bg, #0B1A3C)",
        }}
        aria-label="Mobile navigation"
      >
        <SidebarContents onLinkClick={onClose} />
      </aside>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const base = (pathname.split("?")[0] ?? "").replace(/\/$/, "") || "/";
  const isCommandCenter = base === "/dashboard" || pathname === "/";
  const workspaceShell = isWorkspaceContext(pathname) && !isCommandCenter;
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <ProductTierProvider>
      <div className="kp-dashboard-app flex h-screen min-h-0 flex-col overflow-hidden bg-kp-bg">
        <AppHeader onOpenMobileNav={() => setMobileNavOpen(true)} />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <ModuleSidebar />
          <MobileDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

          <div
            className="flex min-h-0 min-w-0 flex-1 flex-col lg:ml-[200px]"
          >
            {workspaceShell ? <WorkspaceMainContextBar /> : null}

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
              <main className="min-h-0 flex-1 bg-kp-bg px-5 pb-4 pt-3 md:px-7 md:pb-5 md:pt-4 lg:px-9">
                <div className="mx-auto min-h-[50vh] w-full max-w-6xl">{children}</div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </ProductTierProvider>
  );
}

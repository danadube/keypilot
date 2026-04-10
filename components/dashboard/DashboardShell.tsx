"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { ProductTierProvider } from "@/components/ProductTierProvider";
import {
  DASHBOARD_SIDEBAR_WIDTH_PX,
  ModuleSidebar,
  SidebarContents,
} from "@/components/layout/ModuleSidebar";
import { ShowingHQWorkbenchHeaderActions } from "@/components/dashboard/ShowingHQWorkbenchHeaderActions";
import { cn } from "@/lib/utils";
import { shellTopRowHeightClass } from "@/lib/shell-top-bar";
import { isWorkspaceContext } from "@/lib/showing-hq/isShowingHQContext";

/** Matches `ModuleSidebar` so header + rail read as one chrome surface. */
const SHELL_CHROME_BG_STYLE = {
  backgroundColor: "var(--brand-sidebar-bg, #0B1A3C)",
} as const;

/**
 * Date + time under workspace shell title (ShowingHQ, FarmTrackr, PropertyVault, ClientKeep, etc.) — client-only
 * so locale and timezone match the user and avoid SSR hydration mismatches.
 * Format: "Thursday, April 2, 2026 • 4:27 PM" (locale from `undefined` = user default).
 */
function WorkspaceShellDateTimeLine() {
  const [line, setLine] = React.useState<string | null>(null);
  React.useEffect(() => {
    function formatNow() {
      const d = new Date();
      const datePart = d.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      const timePart = d.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
      setLine(`${datePart} • ${timePart}`);
    }
    formatNow();
    const id = window.setInterval(formatNow, 60_000);
    return () => window.clearInterval(id);
  }, []);
  if (!line) return null;
  return (
    <p className="mt-0.5 truncate text-[11px] tabular-nums text-kp-on-surface-muted">
      {line}
    </p>
  );
}

function getPageTitle(pathname: string): string {
  const base = (pathname.split("?")[0] ?? "").replace(/\/$/, "") || "/";
  // Workspace shells: module name only; tabs/page carry section identity.
  if (base.startsWith("/showing-hq") || base.startsWith("/open-houses")) {
    return "ShowingHQ";
  }
  if (pathname.startsWith("/contacts") || pathname.startsWith("/client-keep")) {
    return "ClientKeep";
  }
  if (pathname.startsWith("/property-vault") || pathname.startsWith("/properties")) {
    return "PropertyVault";
  }
  if (pathname.startsWith("/transactions")) {
    return "TransactionHQ";
  }
  if (pathname.startsWith("/farm-trackr")) {
    return "FarmTrackr";
  }
  if (pathname.startsWith("/market-pilot/campaigns")) return "Campaigns";
  if (pathname.startsWith("/market-pilot")) return "MarketPilot";
  if (pathname.startsWith("/deals")) return "Deals";
  if (pathname.startsWith("/settings/integrations")) return "Integrations";
  if (pathname.startsWith("/settings")) return "Settings";
  if (base === "/roadmap") return "Roadmap";
  if (base === "/dashboard" || pathname === "/") return "Dashboard";
  return "KeyPilot";
}

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
    <div className="fixed inset-0 z-40 lg:hidden">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 transition-opacity duration-200",
          animate ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-hidden
      />
      {/* Drawer panel */}
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
  /** + New stays available globally (direct-create links), not only on ShowingHQ surfaces. */
  const showHeaderNewMenu = true;
  const workspaceShell = isWorkspaceContext(pathname);
  const pageTitle = getPageTitle(pathname);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Close mobile nav on route change
  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <ProductTierProvider>
    <div className="kp-dashboard-app flex h-screen min-h-0 overflow-hidden bg-kp-bg">
      {/* Desktop fixed sidebar */}
      <ModuleSidebar />
      {/* Mobile slide-in drawer */}
      <MobileDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col lg:ml-[200px]"
      >
        {/* Single scroll region so the header can use sticky top-0 and stay pinned. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <header
            className={cn(
              "sticky top-0 z-20 flex w-full shrink-0 border-b border-white/[0.08] shadow-none",
              workspaceShell ? "items-center" : "items-stretch",
              shellTopRowHeightClass(pathname)
            )}
            style={SHELL_CHROME_BG_STYLE}
          >
            <div className="flex min-w-0 flex-1 items-center overflow-hidden pl-3 pr-3 md:pl-6 md:pr-4 lg:pl-10">
              {/* Hamburger — mobile only */}
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="mr-3 shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                {workspaceShell ? (
                  <>
                    {pageTitle === "ShowingHQ" ? (
                      <h1
                        className="truncate text-lg font-semibold leading-none tracking-tight text-kp-on-surface md:text-xl"
                        aria-label="ShowingHQ"
                      >
                        <span className="text-kp-on-surface">Showing</span>
                        <span className="text-kp-teal">HQ</span>
                      </h1>
                    ) : pageTitle === "ClientKeep" ? (
                      <h1
                        aria-label="ClientKeep"
                        className="truncate text-lg font-semibold leading-none tracking-tight md:text-xl"
                      >
                        <span className="text-kp-on-surface">Client</span>
                        <span className="text-kp-teal">Keep</span>
                      </h1>
                    ) : pageTitle === "PropertyVault" ? (
                      <h1
                        aria-label="PropertyVault"
                        className="truncate text-lg font-semibold leading-none tracking-tight md:text-xl"
                      >
                        <span className="text-kp-on-surface">Property</span>
                        <span className="text-kp-teal">Vault</span>
                      </h1>
                    ) : pageTitle === "TransactionHQ" ? (
                      <h1
                        aria-label="TransactionHQ"
                        className="truncate text-lg font-semibold leading-none tracking-tight md:text-xl"
                      >
                        <span className="text-kp-on-surface">Transaction</span>
                        <span className="text-kp-teal">HQ</span>
                      </h1>
                    ) : pageTitle === "FarmTrackr" ? (
                      <h1
                        aria-label="FarmTrackr"
                        className="truncate text-lg font-semibold leading-none tracking-tight md:text-xl"
                      >
                        <span className="text-kp-on-surface">Farm</span>
                        <span className="text-kp-teal">Trackr</span>
                      </h1>
                    ) : (
                      <h1 className="truncate text-lg font-semibold leading-none tracking-tight text-kp-on-surface md:text-xl">
                        {pageTitle}
                      </h1>
                    )}
                    <WorkspaceShellDateTimeLine />
                  </>
                ) : (
                  <h1 className="truncate text-sm font-semibold leading-tight text-kp-on-surface md:text-base">
                    {pageTitle}
                  </h1>
                )}
              </div>
            </div>
            <div
              className="flex shrink-0 items-center gap-1.5 border-l border-white/10 px-2.5 md:gap-2 md:px-3.5"
              style={SHELL_CHROME_BG_STYLE}
            >
              <ShowingHQWorkbenchHeaderActions showNewMenu={showHeaderNewMenu} />
            </div>
          </header>

          <main className="min-h-0 flex-1 bg-kp-bg px-6 pb-5 pt-2 md:px-8 md:pb-6 md:pt-3 lg:px-10">
            <div className="mx-auto min-h-[50vh] w-full max-w-6xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
    </ProductTierProvider>
  );
}

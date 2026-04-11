"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SHELL_CHROME_BG_STYLE = {
  backgroundColor: "var(--brand-sidebar-bg, #0B1A3C)",
} as const;

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
    <p className="mt-0.5 truncate text-[11px] tabular-nums text-kp-on-surface-muted">{line}</p>
  );
}

function getPageTitle(pathname: string): string {
  const base = (pathname.split("?")[0] ?? "").replace(/\/$/, "") || "/";
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

/**
 * Module identity row for workspace routes — sits in the main column below the global app header.
 */
export function WorkspaceMainContextBar({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const pageTitle = getPageTitle(pathname);

  return (
    <div
      className={cn(
        "shrink-0 border-b border-white/[0.07] px-4 py-2 md:px-6 lg:px-8",
        className
      )}
      style={SHELL_CHROME_BG_STYLE}
    >
      {pageTitle === "ShowingHQ" ? (
        <h2
          className="truncate text-base font-semibold leading-none tracking-tight text-kp-on-surface md:text-lg"
          aria-label="ShowingHQ"
        >
          <span className="text-kp-on-surface">Showing</span>
          <span className="text-kp-teal">HQ</span>
        </h2>
      ) : pageTitle === "ClientKeep" ? (
        <h2
          aria-label="ClientKeep"
          className="truncate text-base font-semibold leading-none tracking-tight md:text-lg"
        >
          <span className="text-kp-on-surface">Client</span>
          <span className="text-kp-teal">Keep</span>
        </h2>
      ) : pageTitle === "PropertyVault" ? (
        <h2
          aria-label="PropertyVault"
          className="truncate text-base font-semibold leading-none tracking-tight md:text-lg"
        >
          <span className="text-kp-on-surface">Property</span>
          <span className="text-kp-teal">Vault</span>
        </h2>
      ) : pageTitle === "TransactionHQ" ? (
        <h2
          aria-label="TransactionHQ"
          className="truncate text-base font-semibold leading-none tracking-tight md:text-lg"
        >
          <span className="text-kp-on-surface">Transaction</span>
          <span className="text-kp-teal">HQ</span>
        </h2>
      ) : pageTitle === "FarmTrackr" ? (
        <h2
          aria-label="FarmTrackr"
          className="truncate text-base font-semibold leading-none tracking-tight md:text-lg"
        >
          <span className="text-kp-on-surface">Farm</span>
          <span className="text-kp-teal">Trackr</span>
        </h2>
      ) : (
        <h2 className="truncate text-base font-semibold leading-none tracking-tight text-kp-on-surface md:text-lg">
          {pageTitle}
        </h2>
      )}
      <WorkspaceShellDateTimeLine />
    </div>
  );
}

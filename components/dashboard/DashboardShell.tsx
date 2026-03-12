"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Home, Building2, Calendar, Users, Settings } from "lucide-react";
import { BrandSidebarNav } from "@/components/ui/BrandSidebarNav";
import { BrandTopbar } from "@/components/ui/BrandTopbar";

const navItems = [
  { label: "Dashboard", href: "/", icon: <Home className="h-5 w-5" /> },
  { label: "Properties", href: "/properties", icon: <Building2 className="h-5 w-5" /> },
  { label: "Open Houses", href: "/open-houses", icon: <Calendar className="h-5 w-5" /> },
  { label: "Contacts", href: "/contacts", icon: <Users className="h-5 w-5" /> },
  { label: "Settings", href: "/settings", icon: <Settings className="h-5 w-5" /> },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const items = navItems.map((item) => ({
    ...item,
    active:
      pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(item.href + "/")) ||
      (item.href !== "/" && pathname === item.href),
  }));

  return (
    <div className="flex min-h-screen">
      <BrandSidebarNav
        title={
          <Link href="/" className="font-semibold text-[var(--brand-text)] hover:text-[var(--brand-primary)] transition-colors">
            KeyPilot
          </Link>
        }
        items={items}
        className="w-64 shrink-0"
      />
      <div className="min-w-0 flex-1 flex flex-col">
        <BrandTopbar right={<UserButton afterSignOutUrl="/" />} />
        <main className="min-h-0 flex-1 overflow-auto p-[var(--space-lg)]">
          <div className="min-h-[50vh]">{children}</div>
        </main>
      </div>
    </div>
  );
}

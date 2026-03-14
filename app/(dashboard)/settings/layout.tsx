"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/settings/account", label: "Account" },
  { href: "/settings/connections", label: "Connections" },
  { href: "/settings/automation", label: "Automation" },
  { href: "/settings/ai", label: "AI" },
  { href: "/settings/modules", label: "Modules" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (pathname === href) return true;
    if (href !== "/settings" && pathname.startsWith(href + "/")) return true;
    return false;
  };

  return (
    <div className="flex flex-col gap-[var(--space-xl)]">
      <nav className="flex gap-[var(--space-sm)] border-b border-[var(--brand-border)] -mb-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
              isItemActive(item.href)
                ? "text-[var(--brand-primary)] border-[var(--brand-primary)]"
                : "text-[var(--brand-text-muted)] border-transparent hover:text-[var(--brand-text)]"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}

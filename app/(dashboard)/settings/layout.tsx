"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/settings/account", label: "Account" },
  { href: "/settings/branding", label: "Branding" },
  { href: "/settings/connections", label: "Connections" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/automation", label: "Automation" },
  { href: "/settings/ai", label: "AI" },
  { href: "/settings/modules", label: "Modules" },
  { href: "/settings/daily-briefing/preview", label: "Daily briefing preview" },
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
    <div className="flex flex-col gap-6">
      <nav className="-mb-2 flex gap-1 border-b border-kp-outline">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              isItemActive(item.href)
                ? "border-kp-teal text-kp-teal"
                : "border-transparent text-kp-on-surface-variant hover:text-kp-on-surface"
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

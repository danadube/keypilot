"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type SubNavKey = "overview" | "documents" | "media";

const LINKS: { key: SubNavKey; label: string; href: (id: string) => string }[] = [
  { key: "overview", label: "Overview", href: (id) => `/properties/${id}` },
  { key: "documents", label: "Documents", href: (id) => `/properties/${id}/documents` },
  { key: "media", label: "Photos & media", href: (id) => `/properties/${id}/media` },
];

export function PropertyVaultPropertySubnav({
  propertyId,
  current,
}: {
  propertyId: string;
  current: SubNavKey;
}) {
  return (
    <nav
      className="flex flex-wrap gap-1 rounded-lg border border-kp-outline bg-kp-surface-high/80 p-1"
      aria-label="Property sections"
    >
      {LINKS.map(({ key, label, href }) => (
        <Link
          key={key}
          href={href(propertyId)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            current === key
              ? "bg-kp-surface text-kp-on-surface shadow-sm"
              : "text-kp-on-surface-variant hover:bg-kp-surface hover:text-kp-on-surface"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

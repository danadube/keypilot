"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BrandSidebarNavItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  active?: boolean;
  badge?: string | number;
}

export interface BrandSidebarNavProps {
  items: BrandSidebarNavItem[];
  title?: string;
  footer?: React.ReactNode;
  className?: string;
}

export const BrandSidebarNav: React.FC<BrandSidebarNavProps> = ({
  items,
  title,
  footer,
  className,
}) => {
  return (
    <aside
      className={cn(
        "flex flex-col border-r border-[var(--brand-border)] bg-[var(--brand-surface)]",
        className
      )}
    >
      {title && (
        <div className="border-b border-[var(--brand-border)] px-[var(--space-md)] py-[var(--space-sm)]">
          <p
            className="font-semibold text-[var(--brand-text)]"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-small-size)",
              lineHeight: "var(--text-small-line)",
            }}
          >
            {title}
          </p>
        </div>
      )}
      <nav className="flex-1 overflow-auto px-[var(--space-xs)] py-[var(--space-sm)]">
        <ul className="space-y-[var(--space-xs)]">
          {items.map((item, i) => {
            const content = (
              <>
                {item.icon && (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                    {item.icon}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.badge != null && (
                  <span
                    className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--brand-surface-alt)] px-[var(--space-xs)] py-0"
                    style={{ fontSize: "var(--text-caption-size)" }}
                  >
                    {item.badge}
                  </span>
                )}
              </>
            );
            const baseClasses = cn(
              "flex items-center gap-[var(--space-sm)] rounded-[var(--radius-md)] px-[var(--space-sm)] py-[var(--space-xs)] text-[var(--brand-text-muted)] transition-colors",
              "hover:bg-[var(--brand-surface-alt)] hover:text-[var(--brand-text)]",
              item.active && "bg-[var(--brand-surface-alt)] font-medium text-[var(--brand-primary)]"
            );
            return (
              <li key={i}>
                {item.href ? (
                  <Link href={item.href} className={baseClasses}>
                    {content}
                  </Link>
                ) : (
                  <span
                    className={cn(baseClasses, "cursor-default")}
                    aria-current={item.active ? "page" : undefined}
                  >
                    {content}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      {footer && (
        <div className="border-t border-[var(--brand-border)] p-[var(--space-md)]">
          {footer}
        </div>
      )}
    </aside>
  );
};
BrandSidebarNav.displayName = "BrandSidebarNav";

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrandTab {
  key: string;
  label: string;
  content: React.ReactNode;
  badge?: string | number;
}

export interface BrandTabsProps {
  tabs: BrandTab[];
  defaultTab?: string;
  className?: string;
}

export function BrandTabs({
  tabs,
  defaultTab,
  className,
}: BrandTabsProps) {
  const [activeKey, setActiveKey] = React.useState(
    defaultTab ?? tabs[0]?.key ?? ""
  );

  const activeTab = tabs.find((t) => t.key === activeKey) ?? tabs[0];

  return (
    <div className={cn("w-full", className)}>
      <div
        role="tablist"
        aria-label="Tabs"
        className="flex gap-[var(--space-xs)] border-b border-[var(--brand-border)]"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeKey === tab.key}
            aria-controls={`tabpanel-${tab.key}`}
            id={`tab-${tab.key}`}
            onClick={() => setActiveKey(tab.key)}
            className={cn(
              "inline-flex items-center gap-[var(--space-xs)] py-[var(--space-sm)] px-[var(--space-xs)] font-medium transition-colors",
              "border-b-2 -mb-px",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-[var(--space-xs)] focus-visible:rounded-[var(--radius-sm)]",
              activeKey === tab.key
                ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                : "border-transparent text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]"
            )}
            style={{ fontSize: "var(--text-small-size)" }}
          >
            {tab.label}
            {tab.badge != null && (
              <span
                className={cn(
                  "rounded-[var(--radius-pill)] px-[var(--space-xs)] py-0 font-medium",
                  activeKey === tab.key
                    ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                    : "bg-[var(--brand-surface-alt)] text-[var(--brand-text-muted)]"
                )}
                style={{ fontSize: "var(--text-caption-size)" }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div
        id={`tabpanel-${activeTab?.key}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab?.key}`}
        className="pt-[var(--space-md)]"
      >
        {activeTab?.content}
      </div>
    </div>
  );
}

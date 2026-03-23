"use client";

import { cn } from "@/lib/utils";

export interface SectionTab {
  label: string;
  value: string;
  /** Optional count pill shown beside the label */
  count?: number;
}

interface SectionTabsProps {
  tabs: SectionTab[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Horizontal section tab navigation for the KeyPilot dark design system.
 *
 * Active tab is underlined with gold. Intended for use inside dark containers.
 *
 * @example
 * const [tab, setTab] = useState("all");
 * <SectionTabs
 *   tabs={[{ label: "All", value: "all", count: 12 }, { label: "Active", value: "active" }]}
 *   active={tab}
 *   onChange={setTab}
 * />
 */
export function SectionTabs({ tabs, active, onChange, className }: SectionTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Section navigation"
      className={cn(
        "flex items-end gap-0 border-b border-kp-outline",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              // Layout & spacing
              "relative flex items-center gap-1.5 px-4 pb-2.5 pt-2 text-sm font-medium",
              // Underline trick: -mb-px raises tab 1px above the border-b
              "-mb-px border-b-2 transition-colors",
              isActive
                ? "border-kp-gold text-kp-gold"
                : "border-transparent text-kp-on-surface-variant hover:text-kp-on-surface hover:border-kp-outline"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none",
                  isActive
                    ? "bg-kp-gold/15 text-kp-gold"
                    : "bg-kp-surface-high text-kp-on-surface-variant"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

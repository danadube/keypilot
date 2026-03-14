"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MODULES, MODULE_ORDER, getModuleFromPath } from "@/lib/modules";
import { useProductTier } from "@/components/ProductTierProvider";
import { isUpgradeModule } from "@/lib/module-access";

export function TopModuleNav() {
  const pathname = usePathname();
  const activeId = getModuleFromPath(pathname);
  const { hasModuleAccess, isLoading } = useProductTier();

  return (
    <nav
      className="flex flex-nowrap items-center gap-[30px]"
      role="tablist"
      aria-label="Platform modules"
    >
      {MODULE_ORDER.map((id) => {
        const mod = MODULES[id];
        const isActive = activeId === id || pathname === `/upgrade/${id}`;
        const hasAccess = hasModuleAccess(id);
        const showUpgrade = isUpgradeModule(id) && !hasAccess && !isLoading;

        const href = showUpgrade ? `/upgrade/${id}` : mod.href;
        return (
          <Link
            key={id}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "relative whitespace-nowrap rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
              "hover:bg-[var(--brand-surface-alt)] hover:text-[var(--brand-text)]",
              isActive
                ? "font-semibold text-[var(--brand-text)] [&_.relative]:text-[var(--brand-primary)]"
                : "font-medium text-[var(--brand-text-muted)]",
              !mod.available && "opacity-60"
            )}
          >
            {isActive && (
              <span
                className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full bg-[var(--brand-primary)]"
                aria-hidden
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {mod.name}
              {showUpgrade && (
                <span className="rounded bg-[var(--brand-primary)]/15 px-1.5 py-0.5 text-xs font-medium text-[var(--brand-primary)]">
                  Upgrade
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

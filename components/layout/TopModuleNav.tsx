"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MODULES, MODULE_ORDER, getModuleFromPath, pathMatchesHref } from "@/lib/modules";
import { useProductTier } from "@/components/ProductTierProvider";

export function TopModuleNav() {
  const pathname = usePathname();
  const activeId = getModuleFromPath(pathname);
  const { hasModuleAccess, isLoading } = useProductTier();

  let enabledModules = MODULE_ORDER.filter((id) => {
    return hasModuleAccess(id) && MODULES[id]?.available && !isLoading;
  });

  if (hasModuleAccess("showing-hq") && enabledModules.includes("showing-hq")) {
    enabledModules = ["showing-hq", ...enabledModules.filter((id) => id !== "showing-hq")];
  }

  return (
    <div className="flex min-w-0 flex-1 items-center overflow-x-auto overflow-y-hidden [scrollbar-width:thin]">
      <nav
        className="flex flex-nowrap items-center gap-[30px] py-1"
        role="tablist"
        aria-label="Platform modules"
      >
        {enabledModules.map((id) => {
          const mod = MODULES[id];
          if (!mod?.available) return null;
          const isActive =
            (id === "home"
              ? pathMatchesHref(pathname ?? "", "/dashboard") || pathname === "/"
              : activeId === id) || pathname === `/upgrade/${id}`;
          const href = mod.href;

          return (
            <Link
              key={id}
              href={href}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "relative whitespace-nowrap rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                "hover:bg-kp-surface-high hover:text-kp-on-surface",
                isActive
                  ? "font-semibold text-kp-on-surface"
                  : "font-medium text-kp-on-surface-variant"
              )}
            >
              {isActive && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full bg-kp-teal"
                  aria-hidden
                />
              )}
              <span className="relative">{mod.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

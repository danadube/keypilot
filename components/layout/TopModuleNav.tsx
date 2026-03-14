"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MODULES, MODULE_ORDER, getModuleFromPath } from "@/lib/modules";

export function TopModuleNav() {
  const pathname = usePathname();
  const activeId = getModuleFromPath(pathname);

  return (
    <nav
      className="flex flex-nowrap items-center gap-[30px]"
      role="tablist"
      aria-label="Platform modules"
    >
      {MODULE_ORDER.map((id) => {
        const mod = MODULES[id];
        const isActive = activeId === id;
        return (
          <Link
            key={id}
            href={mod.href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "relative whitespace-nowrap rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
              "hover:bg-[var(--brand-surface-alt)] hover:text-[var(--brand-text)]",
              isActive
                ? "font-semibold text-[var(--brand-text)] [&_.relative]:text-[var(--brand-primary)]"
                : "font-medium text-[var(--brand-text-muted)]",
              !mod.available && "opacity-60 cursor-default"
            )}
          >
            {isActive && (
              <span
                className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full bg-[var(--brand-primary)]"
                aria-hidden
              />
            )}
            <span className="relative">{mod.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

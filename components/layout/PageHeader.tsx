"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actionsMenu?: React.ReactNode;
  primaryAction?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  actionsMenu,
  primaryAction,
  className,
}: PageHeaderProps) {
  const hasRight = Boolean(actionsMenu || primaryAction);
  return (
    <header
      className={cn(
        "bg-transparent pb-4 pt-1 md:pb-5 md:pt-1.5",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-2.5",
          hasRight && "sm:flex-row sm:items-start sm:justify-between sm:gap-4"
        )}
      >
        <div className="min-w-0">
          <h1 className="font-headline text-xl font-semibold tracking-tight text-kp-on-surface md:text-2xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 max-w-2xl text-sm leading-snug text-kp-on-surface-variant">
              {subtitle}
            </p>
          ) : null}
        </div>
        {hasRight ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {actionsMenu}
            {primaryAction}
          </div>
        ) : null}
      </div>
    </header>
  );
}

const actionsSummaryClass = cn(
  kpBtnSecondary,
  "flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-kp-outline px-3 text-xs font-medium text-kp-on-surface shadow-sm",
  "[&::-webkit-details-marker]:hidden"
);

export function PageHeaderActionsMenu({ children }: { children: React.ReactNode }) {
  return (
    <details className="group relative">
      <summary className={actionsSummaryClass}>
        Actions
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div
        className={cn(
          "absolute right-0 z-40 mt-1 hidden min-w-[12rem] rounded-lg border border-kp-outline bg-kp-surface py-1 shadow-lg",
          "group-open:block"
        )}
        role="menu"
      >
        {children}
      </div>
    </details>
  );
}

export function PageHeaderActionItem({
  className,
  ...props
}: React.ComponentProps<"a">) {
  return (
    <a
      role="menuitem"
      className={cn(
        "block px-3 py-2 text-xs text-kp-on-surface transition-colors hover:bg-kp-surface-high",
        className
      )}
      {...props}
    />
  );
}

export function PageHeaderActionButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "block w-full px-3 py-2 text-left text-xs text-kp-on-surface transition-colors hover:bg-kp-surface-high",
        className
      )}
      {...props}
    />
  );
}

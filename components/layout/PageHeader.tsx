"use client";

import * as React from "react";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { kpBtnSecondary, kpBtnSave } from "@/components/ui/kp-dashboard-button-tiers";
import { getModulePageTitleTwoTone } from "@/lib/ui/module-page-title-two-tone";

export type PageHeaderProps = {
  title?: string;
  subtitle?: string;
  /** When `title` is omitted, optional quiet label (e.g. ShowingHQ view name). */
  leading?: React.ReactNode;
  actionsMenu?: React.ReactNode;
  primaryAction?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  leading,
  actionsMenu,
  primaryAction,
  className,
}: PageHeaderProps) {
  const hasRight = Boolean(actionsMenu || primaryAction);
  const hasLeftContent = Boolean(title || subtitle || leading);
  const titleTone = title ? getModulePageTitleTwoTone(title) : undefined;
  const titleHeadingClass =
    "font-headline text-xl font-semibold tracking-tight md:text-2xl";
  return (
    <header
      className={cn(
        "min-w-0 bg-transparent pb-4 pt-1 md:pb-5 md:pt-1.5",
        className
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-2.5",
          hasRight &&
            hasLeftContent &&
            "sm:flex-row sm:items-start sm:justify-between sm:gap-4",
          hasRight && !hasLeftContent && "items-end sm:items-center"
        )}
      >
        {hasLeftContent ? (
          <div className="min-w-0">
            {title ? (
              <>
                {titleTone ? (
                  <h1 className={titleHeadingClass}>
                    <span className="text-kp-on-surface">{titleTone[0]}</span>
                    <span className="text-kp-teal">{titleTone[1]}</span>
                  </h1>
                ) : (
                  <h1 className={cn(titleHeadingClass, "text-kp-on-surface")}>{title}</h1>
                )}
                {subtitle ? (
                  <p className="mt-0.5 max-w-2xl text-sm leading-snug text-kp-on-surface-variant">
                    {subtitle}
                  </p>
                ) : null}
              </>
            ) : (
              leading
            )}
          </div>
        ) : null}
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

/** Horizontal rule between groups inside {@link PageHeaderActionsMenu} or {@link PageHeaderPrimaryAddMenu}. */
export function PageHeaderActionsMenuSeparator() {
  return <div className="my-1 h-px bg-kp-outline/70" role="separator" aria-hidden />;
}

export function PageHeaderActionsMenu({
  children,
  summaryLabel = "Actions",
}: {
  children: React.ReactNode;
  /** Button label (e.g. `Workspace` when module nav should not compete with page-level Actions). */
  summaryLabel?: string;
}) {
  return (
    <details className="group relative">
      <summary className={actionsSummaryClass}>
        {summaryLabel}
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

const primaryAddSummaryClass = cn(
  kpBtnSave,
  "flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-transparent px-3 text-xs font-semibold text-kp-bg shadow-sm transition-colors hover:opacity-95",
  "[&::-webkit-details-marker]:hidden"
);

/** Gold primary CTA — single link (no dropdown), e.g. ClientKeep “Add client”. */
export const pageHeaderPrimaryCtaLinkClass = cn(
  kpBtnSave,
  "inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-transparent px-3 text-xs font-semibold text-kp-bg shadow-sm transition-colors hover:opacity-95"
);

/** Gold primary “+ Add” control — same panel pattern as `PageHeaderActionsMenu`. */
export function PageHeaderPrimaryAddMenu({ children }: { children: React.ReactNode }) {
  return (
    <details className="group relative">
      <summary className={primaryAddSummaryClass}>
        <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Add
        <ChevronDown
          className="h-3.5 w-3.5 shrink-0 opacity-80 transition-transform group-open:rotate-180"
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

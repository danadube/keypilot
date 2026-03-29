"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";

export type EditableBlockVariant = "inline" | "expandable" | "table";

type EditableBlockContextValue = {
  variant: EditableBlockVariant;
  expanded: boolean;
  setExpanded: (next: boolean) => void;
  blockRef: React.RefObject<HTMLDivElement | null>;
};

const EditableBlockContext = React.createContext<EditableBlockContextValue | null>(null);

function useEditableBlockContext(component: string): EditableBlockContextValue {
  const ctx = React.useContext(EditableBlockContext);
  if (!ctx) {
    throw new Error(`${component} must be used inside <EditableBlock>`);
  }
  return ctx;
}

const blockShell = "space-y-3 rounded-xl border border-kp-outline/80 bg-kp-surface-high/25 p-4";

/**
 * Non-interactive cue (e.g. next to non-form sections). Prefer {@link EditableBlockHeader} Edit button when possible.
 */
export function EditableBlockHint({
  className,
  label = "Edit",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1 text-kp-teal", className)}
      title="Fields in this section are editable"
    >
      <Pencil className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
      <span className="text-xs font-medium">{label}</span>
    </span>
  );
}

/** Standard “Edit” column label for editable tables */
export function EditableBlockTableEditHeading({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-end gap-1 text-kp-teal",
        className
      )}
    >
      <Pencil className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
      Edit
    </span>
  );
}

function EditableBlockEditTrigger({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        kpBtnTertiary,
        "h-8 shrink-0 gap-1.5 px-2 text-xs font-medium text-kp-teal hover:text-kp-teal",
        className
      )}
      onClick={onClick}
    >
      <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Edit
    </Button>
  );
}

export function EditableBlock({
  variant = "inline",
  defaultExpanded = true,
  expanded: expandedControlled,
  onExpandedChange,
  className,
  children,
}: {
  variant?: EditableBlockVariant;
  /** expandable: initial open state when uncontrolled */
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (open: boolean) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const blockRef = React.useRef<HTMLDivElement>(null);
  const [uncontrolledExpanded, setUncontrolledExpanded] = React.useState(defaultExpanded);
  const expanded = expandedControlled ?? uncontrolledExpanded;
  const setExpanded = React.useCallback(
    (next: boolean) => {
      onExpandedChange?.(next);
      if (expandedControlled === undefined) {
        setUncontrolledExpanded(next);
      }
    },
    [expandedControlled, onExpandedChange]
  );

  const value = React.useMemo(
    () => ({ variant, expanded, setExpanded, blockRef }),
    [variant, expanded, setExpanded]
  );

  const shell =
    variant === "table"
      ? "rounded-xl border border-kp-outline bg-kp-surface p-5"
      : blockShell;

  return (
    <EditableBlockContext.Provider value={value}>
      <div
        ref={blockRef}
        data-editable-block
        data-editable-variant={variant}
        className={cn(shell, className)}
      >
        {children}
      </div>
    </EditableBlockContext.Provider>
  );
}

export function EditableBlockHeader({
  title,
  description,
  /** muted = small caps section label; default = panel title */
  titleTone = "muted",
  showEditButton = true,
  onEditClick,
  trailing,
  headerClassName,
}: {
  title: string;
  description?: string;
  titleTone?: "muted" | "default";
  showEditButton?: boolean;
  /** Overrides default focus / expand behavior */
  onEditClick?: () => void;
  /** Replaces the Edit button when set */
  trailing?: React.ReactNode;
  headerClassName?: string;
}) {
  const ctx = useEditableBlockContext("EditableBlockHeader");

  const focusFirstEditable = React.useCallback(() => {
    const root = ctx.blockRef.current;
    const el = root?.querySelector<HTMLElement>(
      "[data-editable-focus]:not([disabled])"
    );
    el?.focus();
  }, [ctx.blockRef]);

  const handleEdit = React.useCallback(() => {
    if (onEditClick) {
      onEditClick();
      return;
    }
    if (ctx.variant === "expandable") {
      ctx.setExpanded(!ctx.expanded);
      return;
    }
    focusFirstEditable();
  }, [onEditClick, ctx, focusFirstEditable]);

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-2 border-b border-kp-outline/40 pb-2",
        headerClassName
      )}
    >
      <div className="min-w-0">
        <p
          className={cn(
            titleTone === "muted" &&
              "text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant",
            titleTone === "default" && "text-sm font-semibold text-kp-on-surface"
          )}
        >
          {title}
        </p>
        {description ? (
          <p className="mt-1 text-xs text-kp-on-surface-variant">{description}</p>
        ) : null}
      </div>
      <div className="mt-0.5 flex shrink-0 items-center gap-2">
        {trailing}
        {showEditButton ? <EditableBlockEditTrigger onClick={handleEdit} /> : null}
      </div>
    </div>
  );
}

/**
 * expandable + `display`: shows display when collapsed; shows `children` when expanded.
 * inline / table: always renders `children`.
 */
export function EditableBlockContent({
  display,
  children,
  className,
}: {
  display?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useEditableBlockContext("EditableBlockContent");

  if (ctx.variant === "expandable" && display != null && !ctx.expanded) {
    return <div className={cn("space-y-2", className)}>{display}</div>;
  }

  return <div className={cn("space-y-3", className)}>{children}</div>;
}

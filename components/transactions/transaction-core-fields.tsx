"use client";

import { cn } from "@/lib/utils";
import type { TransactionFormStatus } from "@/lib/transactions/form-options";
import { TRANSACTION_STATUS_FORM_OPTIONS } from "@/lib/transactions/form-options";

export interface TransactionCoreFieldsProps {
  className?: string;
  /** Create flow requires an explicit side before submit. */
  variant: "create" | "edit";
  status: TransactionFormStatus;
  onStatusChange: (v: TransactionFormStatus) => void;
  /** Empty string = not selected (create). BUY/SELL or null legacy (edit). */
  side: "BUY" | "SELL" | "" | null;
  onSideChange: (v: "BUY" | "SELL" | "") => void;
  salePrice: string;
  onSalePriceChange: (v: string) => void;
  closingDate: string;
  onClosingDateChange: (v: string) => void;
  brokerageName: string;
  onBrokerageNameChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  baseCommission: string;
  onBaseCommissionChange: (v: string) => void;
  baseCommissionDisabled?: boolean;
  baseCommissionHelper?: string;
}

/**
 * Shared operational fields for transaction create/edit (identity + economics + notes).
 * Property and deal pickers live in the parent (create modal / detail page).
 */
export function TransactionCoreFields({
  className,
  variant,
  status,
  onStatusChange,
  side,
  onSideChange,
  salePrice,
  onSalePriceChange,
  closingDate,
  onClosingDateChange,
  brokerageName,
  onBrokerageNameChange,
  notes,
  onNotesChange,
  baseCommission,
  onBaseCommissionChange,
  baseCommissionDisabled,
  baseCommissionHelper,
}: TransactionCoreFieldsProps) {
  const sideRequired = variant === "create";

  return (
    <div className={cn("space-y-5", className)}>
      <div className="rounded-lg border border-kp-outline bg-kp-surface-high/40 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
          Basic info
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="txn-side"
              className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted"
            >
              Side{sideRequired ? <span className="text-rose-300"> *</span> : null}
            </label>
            <select
              id="txn-side"
              value={side ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onSideChange(v === "" ? "" : (v as "BUY" | "SELL"));
              }}
              className={cn(
                "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface",
                "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
              )}
            >
              <option value="">{sideRequired ? "Select buy or sell…" : "— Not set —"}</option>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="txn-status"
              className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted"
            >
              Status
            </label>
            <select
              id="txn-status"
              value={status}
              onChange={(e) => onStatusChange(e.target.value as TransactionFormStatus)}
              className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
            >
              {TRANSACTION_STATUS_FORM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-kp-outline bg-kp-surface-high/40 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
          Deal economics
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="txn-price"
              className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted"
            >
              Sale price
            </label>
            <input
              id="txn-price"
              type="text"
              inputMode="decimal"
              value={salePrice}
              onChange={(e) => onSalePriceChange(e.target.value)}
              placeholder="Optional"
              className={cn(
                "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm",
                "text-kp-on-surface placeholder:text-kp-on-surface-placeholder",
                "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
              )}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="txn-close"
              className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted"
            >
              Closing date
            </label>
            <input
              id="txn-close"
              type="date"
              value={closingDate}
              onChange={(e) => onClosingDateChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label
              htmlFor="txn-brokerage"
              className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted"
            >
              Brokerage
            </label>
            <input
              id="txn-brokerage"
              type="text"
              value={brokerageName}
              onChange={(e) => onBrokerageNameChange(e.target.value)}
              className={cn(
                "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm",
                "text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
              )}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label
              htmlFor="txn-base-commission"
              className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted"
            >
              Base commission (USD)
            </label>
            <input
              id="txn-base-commission"
              type="text"
              inputMode="decimal"
              value={baseCommission}
              onChange={(e) => onBaseCommissionChange(e.target.value)}
              placeholder="Optional — one summary line"
              disabled={baseCommissionDisabled}
              className={cn(
                "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm",
                "text-kp-on-surface placeholder:text-kp-on-surface-placeholder",
                "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40",
                baseCommissionDisabled && "cursor-not-allowed opacity-50"
              )}
            />
            {baseCommissionHelper ? (
              <p className="text-xs text-kp-on-surface-variant">{baseCommissionHelper}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-kp-outline bg-kp-surface-high/40 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
          Notes
        </p>
        <div className="mt-3 space-y-1.5">
          <label htmlFor="txn-notes" className="sr-only">
            Notes
          </label>
          <textarea
            id="txn-notes"
            rows={3}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className={cn(
              "w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm",
              "text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
            )}
          />
        </div>
      </div>
    </div>
  );
}

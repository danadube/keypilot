"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TransactionSide } from "@prisma/client";
import type { TransactionFormStatus } from "@/lib/transactions/form-options";
import {
  isoToDateInput,
  parseOptionalBaseCommissionInput,
  parseOptionalSalePriceInput,
  salePriceToInput,
} from "@/lib/transactions/parse-transaction-form";
import { TransactionCoreFields } from "./transaction-core-fields";

type TxStatus =
  | "LEAD"
  | "UNDER_CONTRACT"
  | "IN_ESCROW"
  | "PENDING"
  | "CLOSED"
  | "FALLEN_APART";

type CommissionRow = {
  id: string;
  amount: string | number;
};

export interface TransactionEditSnapshot {
  id: string;
  status: TxStatus;
  transactionSide?: TransactionSide | null;
  salePrice: string | number | null;
  closingDate: string | null;
  brokerageName: string | null;
  notes: string | null;
  commissions: CommissionRow[];
}

export interface TransactionEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionEditSnapshot | null;
  onSaved: () => void | Promise<void>;
}

/**
 * Modal editor for core transaction fields (same shape as create manual flow).
 */
export function TransactionEditDialog({
  open,
  onOpenChange,
  transaction,
  onSaved,
}: TransactionEditDialogProps) {
  const [status, setStatus] = useState<TransactionFormStatus>("PENDING");
  const [side, setSide] = useState<"BUY" | "SELL" | "">("");
  const [salePrice, setSalePrice] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [brokerageName, setBrokerageName] = useState("");
  const [notes, setNotes] = useState("");
  const [baseCommission, setBaseCommission] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !transaction) return;
    setStatus(transaction.status as TransactionFormStatus);
    setSide(transaction.transactionSide ?? "");
    setSalePrice(salePriceToInput(transaction.salePrice));
    setClosingDate(isoToDateInput(transaction.closingDate));
    setBrokerageName(transaction.brokerageName ?? "");
    setNotes(transaction.notes ?? "");
    if (transaction.commissions.length === 1) {
      const a = transaction.commissions[0]!.amount;
      setBaseCommission(salePriceToInput(typeof a === "string" ? parseFloat(a) : a));
    } else {
      setBaseCommission("");
    }
  }, [open, transaction]);

  const baseCommissionDisabled = (transaction?.commissions.length ?? 0) > 1;
  const baseCommissionHelper =
    baseCommissionDisabled
      ? "Multiple commission lines exist—edit amounts in the Commissions section below."
      : undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transaction) return;

    const price = parseOptionalSalePriceInput(salePrice);
    if (price === undefined) {
      toast.error("Enter a valid sale price or leave blank to clear.");
      return;
    }

    let basePayload: number | null | undefined = undefined;
    if (!baseCommissionDisabled) {
      const b = parseOptionalBaseCommissionInput(baseCommission);
      if (b === undefined) {
        toast.error("Enter a valid base commission, leave blank to clear, or use 0 to remove the line.");
        return;
      }
      basePayload = b;
    }

    const body: Record<string, unknown> = {
      status,
      salePrice: price,
      closingDate: closingDate.trim() ? closingDate.trim() : null,
      brokerageName: brokerageName.trim() ? brokerageName.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
    };

    if (side === "") body.transactionSide = null;
    else body.transactionSide = side;

    if (!baseCommissionDisabled) {
      body.baseCommissionAmount = basePayload;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Update failed");
      toast.success("Transaction updated");
      onOpenChange(false);
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-kp-bg/70 backdrop-blur-sm"
        onClick={() => {
          if (!saving) onOpenChange(false);
        }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-transaction-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-kp-outline bg-kp-surface shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-kp-outline px-6 py-5">
          <div>
            <h2
              id="edit-transaction-title"
              className="font-headline text-lg font-semibold text-kp-on-surface"
            >
              Edit transaction
            </h2>
            <p className="mt-0.5 text-sm text-kp-on-surface-variant">
              Core record — deal linking stays on the page.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!saving) onOpenChange(false);
            }}
            disabled={saving}
            className="ml-4 shrink-0 rounded-lg p-1.5 text-kp-on-surface-variant transition-colors hover:bg-kp-surface-high hover:text-kp-on-surface"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5">
            <TransactionCoreFields
              variant="edit"
              status={status}
              onStatusChange={setStatus}
              transactionSide={side}
              onTransactionSideChange={setSide}
              salePrice={salePrice}
              onSalePriceChange={setSalePrice}
              closingDate={closingDate}
              onClosingDateChange={setClosingDate}
              brokerageName={brokerageName}
              onBrokerageNameChange={setBrokerageName}
              notes={notes}
              onNotesChange={setNotes}
              baseCommission={baseCommission}
              onBaseCommissionChange={setBaseCommission}
              baseCommissionDisabled={baseCommissionDisabled}
              baseCommissionHelper={baseCommissionHelper}
            />
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-kp-outline px-6 py-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm text-kp-on-surface-variant hover:bg-kp-surface-high hover:text-kp-on-surface disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !transaction}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold",
                saving
                  ? "cursor-not-allowed bg-kp-surface-high text-kp-on-surface-variant"
                  : "bg-kp-gold text-kp-bg hover:bg-kp-gold-bright"
              )}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

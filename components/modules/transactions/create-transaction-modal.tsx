"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Search,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type PropertyOption = {
  id: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
};

type TxStatus =
  | "LEAD"
  | "UNDER_CONTRACT"
  | "IN_ESCROW"
  | "PENDING"
  | "CLOSED"
  | "FALLEN_APART";

type CreatePath = "manual" | "import";

function propertyLabel(p: PropertyOption) {
  return `${p.address1}, ${p.city}, ${p.state} ${p.zip}`;
}

function matchProperty(p: PropertyOption, q: string) {
  const lq = q.toLowerCase();
  return propertyLabel(p).toLowerCase().includes(lq);
}

const STATUS_OPTIONS: { value: TxStatus; label: string }[] = [
  { value: "LEAD", label: "Lead" },
  { value: "PENDING", label: "Pending" },
  { value: "UNDER_CONTRACT", label: "Under contract" },
  { value: "IN_ESCROW", label: "In escrow" },
  { value: "CLOSED", label: "Closed" },
  { value: "FALLEN_APART", label: "Fallen apart" },
];

function PropertySearchPicker({
  items,
  loading,
  selected,
  onSelect,
}: {
  items: PropertyOption[];
  loading: boolean;
  selected: PropertyOption | null;
  onSelect: (item: PropertyOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? items.filter((item) => matchProperty(item, query))
    : items;

  useEffect(() => {
    if (selected) setQuery("");
  }, [selected]);

  if (selected) {
    return (
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
          Property
        </p>
        <div className="flex items-start justify-between gap-3 rounded-lg border border-kp-teal/30 bg-kp-teal/5 px-4 py-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-kp-on-surface">
                {selected.address1}
              </p>
              <p className="truncate text-xs text-kp-on-surface-variant">
                {selected.city}, {selected.state} {selected.zip}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="shrink-0 text-xs font-medium text-kp-on-surface-variant underline-offset-2 hover:text-kp-on-surface hover:underline"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
        Property
      </p>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-kp-on-surface-variant" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search properties by address…"
          className={cn(
            "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high pl-8 pr-8",
            "text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder",
            "transition-colors focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-kp-on-surface-variant hover:text-kp-on-surface"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="max-h-44 overflow-y-auto rounded-lg border border-kp-outline bg-kp-surface-high">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-kp-on-surface-variant" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-5">
            <MapPin className="h-4 w-4 shrink-0 text-kp-on-surface-variant" />
            <p className="text-sm text-kp-on-surface-variant">
              {items.length === 0 ? "No properties found. Add a property first." : "No matches"}
            </p>
          </div>
        ) : (
          <ul>
            {filtered.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className={cn(
                    "flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-kp-surface-higher",
                    i !== 0 && "border-t border-kp-outline"
                  )}
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kp-on-surface-variant" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-kp-on-surface">
                      {item.address1}
                    </p>
                    <p className="truncate text-xs text-kp-on-surface-variant">
                      {item.city}, {item.state} {item.zip}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface CreateTransactionModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateTransactionModal({ open, onClose }: CreateTransactionModalProps) {
  const router = useRouter();

  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);

  const [selectedProperty, setSelectedProperty] = useState<PropertyOption | null>(null);
  const [status, setStatus] = useState<TxStatus>("PENDING");
  const [salePrice, setSalePrice] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [brokerageName, setBrokerageName] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createPath, setCreatePath] = useState<CreatePath>("manual");

  useEffect(() => {
    if (!open) return;

    setSelectedProperty(null);
    setStatus("PENDING");
    setSalePrice("");
    setClosingDate("");
    setBrokerageName("");
    setNotes("");
    setError(null);
    setCreatePath("manual");

    setLoadingProperties(true);
    fetch("/api/v1/properties")
      .then((r) => r.json())
      .then((j) => setProperties(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingProperties(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, submitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    const body: Record<string, unknown> = {
      propertyId: selectedProperty.id,
      status,
    };

    const priceTrim = salePrice.trim().replace(/,/g, "");
    if (priceTrim) {
      const n = parseFloat(priceTrim);
      if (!Number.isNaN(n) && n > 0) body.salePrice = n;
    }

    if (closingDate.trim()) {
      body.closingDate = closingDate.trim();
    }

    if (brokerageName.trim()) {
      body.brokerageName = brokerageName.trim();
    }

    if (notes.trim()) {
      body.notes = notes.trim();
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      const id = json.data?.id as string | undefined;
      if (!id) throw new Error("Invalid response from server");
      onClose();
      router.push(`/transactions/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create transaction");
      setSubmitting(false);
    }
  };

  const canSubmit = !!selectedProperty && !submitting;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-kp-bg/70 backdrop-blur-sm"
        onClick={() => {
          if (!submitting) onClose();
        }}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-transaction-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-kp-outline bg-kp-surface shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-kp-outline px-6 py-5">
          <div>
            <h2
              id="create-transaction-title"
              className="font-headline text-lg font-semibold text-kp-on-surface"
            >
              New transaction
            </h2>
            <p className="mt-0.5 text-sm text-kp-on-surface-variant">
              Choose manual entry or statement import, then continue.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!submitting) onClose();
            }}
            disabled={submitting}
            className="ml-4 shrink-0 rounded-lg p-1.5 text-kp-on-surface-variant transition-colors hover:bg-kp-surface-high hover:text-kp-on-surface"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-kp-outline px-6 py-3">
          <div className="inline-flex rounded-lg border border-kp-outline bg-kp-surface-high p-1">
            <button
              type="button"
              onClick={() => setCreatePath("manual")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                createPath === "manual"
                  ? "bg-kp-gold text-kp-bg"
                  : "text-kp-on-surface-variant hover:text-kp-on-surface"
              )}
            >
              Manual entry
            </button>
            <button
              type="button"
              onClick={() => setCreatePath("import")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                createPath === "import"
                  ? "bg-kp-gold text-kp-bg"
                  : "text-kp-on-surface-variant hover:text-kp-on-surface"
              )}
            >
              Import statement
            </button>
          </div>
        </div>

        {createPath === "import" ? (
          <div className="space-y-4 px-6 py-5">
            <div className="rounded-lg border border-kp-outline bg-kp-surface-high p-4">
              <p className="text-sm font-semibold text-kp-on-surface">Statement import path</p>
              <p className="mt-1 text-sm text-kp-on-surface-variant">
                Use this path when you have a commission statement PDF and want parsed fields
                before creating the transaction.
              </p>
              <p className="mt-2 text-xs text-kp-on-surface-muted">
                If your workspace import endpoint is unavailable, continue with manual entry for now.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-kp-outline pt-4">
              <button
                type="button"
                onClick={() => setCreatePath("manual")}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-kp-teal hover:bg-kp-teal/10"
              >
                Continue with manual
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-5">
            <PropertySearchPicker
              items={properties}
              loading={loadingProperties}
              selected={selectedProperty}
              onSelect={setSelectedProperty}
            />

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
                onChange={(e) => setStatus(e.target.value as TxStatus)}
                className={cn(
                  "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3",
                  "text-sm text-kp-on-surface",
                  "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                )}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="txn-price"
                  className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted"
                >
                  Sale price <span className="font-normal normal-case text-kp-on-surface-muted">(optional)</span>
                </label>
                <input
                  id="txn-price"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 450000"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className={cn(
                    "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3",
                    "text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder",
                    "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="txn-close"
                  className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted"
                >
                  Closing date <span className="font-normal normal-case text-kp-on-surface-muted">(optional)</span>
                </label>
                <input
                  id="txn-close"
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  className={cn(
                    "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3",
                    "text-sm text-kp-on-surface",
                    "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="txn-brokerage"
                className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted"
              >
                Brokerage <span className="font-normal normal-case text-kp-on-surface-muted">(optional)</span>
              </label>
              <input
                id="txn-brokerage"
                type="text"
                value={brokerageName}
                onChange={(e) => setBrokerageName(e.target.value)}
                placeholder="Company or team name"
                className={cn(
                  "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3",
                  "text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder",
                  "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="txn-notes"
                className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted"
              >
                Notes <span className="font-normal normal-case text-kp-on-surface-muted">(optional)</span>
              </label>
              <textarea
                id="txn-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes"
                className={cn(
                  "w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2",
                  "text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder",
                  "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                )}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-kp-outline px-6 py-4">
            <p className="text-xs text-kp-on-surface-variant">
              {selectedProperty ? "Ready to create." : "Select a property to continue."}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!submitting) onClose();
                }}
                disabled={submitting}
                className="rounded-lg px-4 py-2 text-sm text-kp-on-surface-variant transition-colors hover:bg-kp-surface-high hover:text-kp-on-surface disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-colors",
                  canSubmit
                    ? "bg-kp-gold text-kp-bg hover:bg-kp-gold-bright"
                    : "cursor-not-allowed bg-kp-surface-high text-kp-on-surface-variant"
                )}
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitting ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

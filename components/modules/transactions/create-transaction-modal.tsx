"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Loader2,
  MapPin,
  Search,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getCommitBlockReason,
  getLowConfidenceFields,
  prettyFieldName,
} from "@/lib/transactions/commission-import-review";

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

type CreateMode = "manual" | "import";
type BrokerageSelection = "" | "KW" | "BDH" | "CUSTOM";

/** Deal row from GET /api/v1/deals?propertyId= (includes linkedTransaction when filtered by property). */
type DealPickerRow = {
  id: string;
  status: string;
  contact: { id: string; firstName: string; lastName: string };
  linkedTransaction?: { id: string } | null;
};

type ParsedParty = {
  raw: string;
  normalized?: string;
};

type ParsedCommissionLine = {
  label: string;
  amount: number;
  category: "GCI" | "BROKER_FEE" | "DEDUCTION" | "REFERRAL" | "NET" | "OTHER";
  confidence: number;
};

type ParsedPayload = {
  source: {
    fileName: string;
    mimeType: "application/pdf";
    pageCount: number;
    parserVersion: string;
    detectedBrokerage?: string | null;
    parserProfile?: string;
    parserProfileVersion?: string;
  };
  extracted: {
    propertyAddress?: string;
    transactionType: "SALE" | "LEASE" | "REFERRAL_IN" | "REFERRAL_OUT" | "UNKNOWN";
    contractDate?: string;
    closeDate?: string;
    expirationDate?: string;
    buyers: ParsedParty[];
    sellers: ParsedParty[];
    salePrice?: number;
    grossCommission?: number;
    brokerageFeesTotal?: number;
    deductionsTotal?: number;
    netToAgent?: number;
    transactionExternalId?: string;
    brokerageName?: string;
    officeName?: string;
    lineItems: ParsedCommissionLine[];
  };
  scoring: {
    overallConfidence: number;
    fieldConfidence: Record<string, number>;
    warnings: string[];
    missingRequired: string[];
  };
};

const STATUS_OPTIONS: { value: TxStatus; label: string }[] = [
  { value: "LEAD", label: "Lead" },
  { value: "PENDING", label: "Pending" },
  { value: "UNDER_CONTRACT", label: "Under contract" },
  { value: "IN_ESCROW", label: "In escrow" },
  { value: "CLOSED", label: "Closed" },
  { value: "FALLEN_APART", label: "Fallen apart" },
];

const BROKERAGE_SELECT_OPTIONS: { value: BrokerageSelection; label: string }[] = [
  { value: "", label: "Auto (detected)" },
  { value: "KW", label: "Keller Williams (KW)" },
  { value: "BDH", label: "Bennion Deville Homes (BDH)" },
  { value: "CUSTOM", label: "Custom brokerage name" },
];

function brokerageSelectionToName(selection: BrokerageSelection): string | undefined {
  if (selection === "KW") return "Keller Williams";
  if (selection === "BDH") return "Bennion Deville Homes";
  return undefined;
}

function propertyLabel(p: PropertyOption) {
  return `${p.address1}, ${p.city}, ${p.state} ${p.zip}`;
}

function matchProperty(p: PropertyOption, q: string) {
  return propertyLabel(p).toLowerCase().includes(q.toLowerCase());
}

function parseNumberInput(value: string): number | undefined {
  const cleaned = value.trim().replace(/,/g, "");
  if (!cleaned) return undefined;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function formatNumberInput(value?: number) {
  return value === undefined || Number.isNaN(value) ? "" : String(value);
}

function partiesToInput(items: ParsedParty[]) {
  return items.map((p) => p.raw).filter(Boolean).join(", ");
}

function inputToParties(value: string): ParsedParty[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((raw) => ({ raw }));
}

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
  const filtered = query.trim() ? items.filter((item) => matchProperty(item, query)) : items;

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
          placeholder="Search properties by address..."
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
                    <p className="truncate text-sm font-medium text-kp-on-surface">{item.address1}</p>
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

interface CreateTransactionModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateTransactionModal({ open, onClose }: CreateTransactionModalProps) {
  const router = useRouter();
  const importInputRef = useRef<HTMLInputElement>(null);

  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyOption | null>(null);
  const [mode, setMode] = useState<CreateMode>("manual");

  const [status, setStatus] = useState<TxStatus>("PENDING");
  const [salePrice, setSalePrice] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [brokerageName, setBrokerageName] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importSessionId, setImportSessionId] = useState<string | null>(null);
  const [parsedPayload, setParsedPayload] = useState<ParsedPayload | null>(null);
  const [editedPayload, setEditedPayload] = useState<ParsedPayload | null>(null);
  const [selectedBrokerage, setSelectedBrokerage] = useState<BrokerageSelection>("");
  const [dealPickerRows, setDealPickerRows] = useState<DealPickerRow[]>([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState("");

  useEffect(() => {
    if (!open) return;
    setMode("manual");
    setSelectedProperty(null);
    setStatus("PENDING");
    setSalePrice("");
    setClosingDate("");
    setBrokerageName("");
    setNotes("");
    setError(null);
    setParsing(false);
    setCommitting(false);
    setParseError(null);
    setImportSessionId(null);
    setParsedPayload(null);
    setEditedPayload(null);
    setSelectedBrokerage("");
    setDealPickerRows([]);
    setSelectedDealId("");
    setDealsLoading(false);

    setLoadingProperties(true);
    fetch("/api/v1/properties")
      .then((r) => r.json())
      .then((j) => setProperties(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingProperties(false));
  }, [open]);

  useEffect(() => {
    if (!open || !selectedProperty) {
      setDealPickerRows([]);
      setSelectedDealId("");
      return;
    }
    setSelectedDealId("");
    let cancelled = false;
    setDealsLoading(true);
    fetch(`/api/v1/deals?propertyId=${encodeURIComponent(selectedProperty.id)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setDealPickerRows(Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => {
        if (!cancelled) setDealPickerRows([]);
      })
      .finally(() => {
        if (!cancelled) setDealsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, selectedProperty]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting && !committing) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, submitting, committing, onClose]);

  const unlinkedDeals = useMemo(
    () => dealPickerRows.filter((d) => !d.linkedTransaction),
    [dealPickerRows]
  );

  function optionalDealSection(selectId: string) {
    if (!selectedProperty) return null;
    return (
      <div className="rounded-lg border border-kp-outline bg-kp-surface-high p-4">
        <div className="flex items-start gap-2">
          <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-kp-on-surface-variant" aria-hidden />
          <div className="min-w-0 flex-1 space-y-1.5">
            <label
              htmlFor={selectId}
              className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted"
            >
              CRM deal (optional)
            </label>
            <p className="text-xs text-kp-on-surface-variant">
              Same property only. The deal&apos;s contact is how people tie to this closing; leave blank and link
              later on the transaction if you prefer.
            </p>
            {dealsLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-kp-on-surface-variant">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading deals…
              </div>
            ) : unlinkedDeals.length === 0 ? (
              <p className="text-xs text-kp-on-surface-variant">
                No unlinked deals on this property yet. You can link a deal from the transaction after it&apos;s
                created.
              </p>
            ) : (
              <select
                id={selectId}
                value={selectedDealId}
                onChange={(e) => setSelectedDealId(e.target.value)}
                className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface px-3 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
              >
                <option value="">None — link a deal later on the transaction</option>
                {unlinkedDeals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {[d.contact.firstName, d.contact.lastName].filter(Boolean).join(" ") || "Contact"} ·{" "}
                    {d.status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
    );
  }

  function updateExtracted<K extends keyof ParsedPayload["extracted"]>(
    key: K,
    value: ParsedPayload["extracted"][K]
  ) {
    setEditedPayload((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        extracted: {
          ...prev.extracted,
          [key]: value,
        },
      };
    });
  }

  async function handleParse(file: File) {
    setParsing(true);
    setParseError(null);
    setImportSessionId(null);
    setParsedPayload(null);
    setEditedPayload(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/transactions/imports/parse", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to parse statement");

      const payload = json.parsedPayload as ParsedPayload;
      setImportSessionId(json.importSessionId as string);
      setParsedPayload(payload);
      setEditedPayload(payload);
      setSalePrice(formatNumberInput(payload.extracted.salePrice));
      setClosingDate(payload.extracted.closeDate ?? "");
      const detectedDefaultName =
        payload.source.detectedBrokerage === "KW"
          ? "Keller Williams"
          : payload.source.detectedBrokerage === "BDH"
            ? "Bennion Deville Homes"
            : "";
      setBrokerageName(payload.extracted.brokerageName ?? detectedDefaultName);
      if (payload.source.detectedBrokerage === "KW") {
        setSelectedBrokerage("KW");
      } else if (payload.source.detectedBrokerage === "BDH") {
        setSelectedBrokerage("BDH");
      } else {
        setSelectedBrokerage("");
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse statement");
    } finally {
      setParsing(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function handleManualCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProperty) return;

    const body: Record<string, unknown> = {
      propertyId: selectedProperty.id,
      status,
    };
    if (selectedDealId) body.dealId = selectedDealId;
    const parsedSalePrice = parseNumberInput(salePrice);
    if (parsedSalePrice !== undefined && parsedSalePrice > 0) body.salePrice = parsedSalePrice;
    if (closingDate.trim()) body.closingDate = closingDate.trim();
    if (brokerageName.trim()) body.brokerageName = brokerageName.trim();
    if (notes.trim()) body.notes = notes.trim();

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
  }

  async function handleCommitImport() {
    if (!selectedProperty || !importSessionId || !editedPayload) return;
    setCommitting(true);
    setParseError(null);
    try {
      const selectedBrokerageName = brokerageSelectionToName(selectedBrokerage);
      const finalBrokerageName =
        selectedBrokerageName ?? (brokerageName.trim() || null);
      const res = await fetch(`/api/v1/transactions/imports/${importSessionId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editedPayload,
          transaction: {
            propertyId: selectedProperty.id,
            ...(selectedDealId ? { dealId: selectedDealId } : {}),
            status,
            salePrice: parseNumberInput(salePrice) ?? null,
            closingDate: closingDate || null,
            brokerageName: finalBrokerageName,
            notes: notes.trim() || null,
          },
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to commit import");
      const transactionId = json.transactionId as string | null;
      if (!transactionId) throw new Error("Invalid response from server");
      onClose();
      router.push(`/transactions/${transactionId}`);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to commit import");
    } finally {
      setCommitting(false);
    }
  }

  const canManualSubmit = !!selectedProperty && !submitting;
  const importCommitBlockReason = editedPayload
    ? getCommitBlockReason(editedPayload)
    : "Upload a PDF to generate preview.";
  const lowConfidenceFields = editedPayload ? getLowConfidenceFields(editedPayload) : [];
  const canCommitImport =
    !!selectedProperty &&
    !!importSessionId &&
    !!editedPayload &&
    !parsing &&
    !committing &&
    !importCommitBlockReason;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-kp-bg/70 backdrop-blur-sm"
        onClick={() => {
          if (!submitting && !committing) onClose();
        }}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-transaction-title"
        className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-kp-outline bg-kp-surface shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-kp-outline px-6 py-5">
          <div>
            <h2 id="create-transaction-title" className="font-headline text-lg font-semibold text-kp-on-surface">
              New transaction
            </h2>
            <p className="mt-0.5 text-sm text-kp-on-surface-variant">
              Manual entry or statement import. Everything stays editable.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!submitting && !committing) onClose();
            }}
            disabled={submitting || committing}
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
              onClick={() => setMode("manual")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                mode === "manual"
                  ? "bg-kp-gold text-kp-bg"
                  : "text-kp-on-surface-variant hover:text-kp-on-surface"
              )}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => setMode("import")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                mode === "import"
                  ? "bg-kp-gold text-kp-bg"
                  : "text-kp-on-surface-variant hover:text-kp-on-surface"
              )}
            >
              Import commission statement
            </button>
          </div>
        </div>

        {mode === "manual" ? (
          <form onSubmit={handleManualCreate}>
            <div className="space-y-5 px-6 py-5">
              <PropertySearchPicker
                items={properties}
                loading={loadingProperties}
                selected={selectedProperty}
                onSelect={setSelectedProperty}
              />
              {optionalDealSection("create-txn-deal-manual")}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TxStatus)}
                    className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                    Closing date (optional)
                  </label>
                  <input
                    type="date"
                    value={closingDate}
                    onChange={(e) => setClosingDate(e.target.value)}
                    className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                    Sale price (optional)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                    Brokerage (optional)
                  </label>
                  <input
                    type="text"
                    value={brokerageName}
                    onChange={(e) => setBrokerageName(e.target.value)}
                    className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                  Notes (optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
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
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded-lg px-4 py-2 text-sm text-kp-on-surface-variant transition-colors hover:bg-kp-surface-high hover:text-kp-on-surface disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canManualSubmit}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-colors",
                    canManualSubmit
                      ? "bg-kp-gold text-kp-bg hover:bg-kp-gold-bright"
                      : "cursor-not-allowed bg-kp-surface-high text-kp-on-surface-variant"
                  )}
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {submitting ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <>
            <div className="space-y-5 px-6 py-5">
              <PropertySearchPicker
                items={properties}
                loading={loadingProperties}
                selected={selectedProperty}
                onSelect={setSelectedProperty}
              />
              {optionalDealSection("create-txn-deal-import")}

              <div className="space-y-2 rounded-lg border border-kp-outline bg-kp-surface-high p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                  Statement PDF
                </p>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleParse(file);
                  }}
                  disabled={parsing || committing}
                />
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  disabled={parsing || committing}
                  className={cn(
                    "flex h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors",
                    parsing || committing
                      ? "cursor-not-allowed bg-kp-surface-higher text-kp-on-surface-variant"
                      : "bg-kp-gold text-kp-bg hover:bg-kp-gold-bright"
                  )}
                >
                  {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {parsing ? "Parsing statement..." : "Upload and parse PDF"}
                </button>
                {parsedPayload && (
                  <div className="space-y-1 text-xs text-kp-on-surface-variant">
                    <p>
                      Parsed {parsedPayload.source.fileName} · {parsedPayload.source.pageCount} page(s)
                    </p>
                    <p>
                      Profile: {parsedPayload.source.parserProfile ?? "generic"} (
                      {parsedPayload.source.parserProfileVersion ?? "v1"})
                      {parsedPayload.source.detectedBrokerage
                        ? ` · Detected brokerage: ${parsedPayload.source.detectedBrokerage}`
                        : ""}
                    </p>
                  </div>
                )}
              </div>

              {editedPayload && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                        Brokerage profile
                      </label>
                      <select
                        value={selectedBrokerage}
                        onChange={(e) => {
                          const next = e.target.value as BrokerageSelection;
                          setSelectedBrokerage(next);
                          const mapped = brokerageSelectionToName(next);
                          if (mapped) {
                            setBrokerageName(mapped);
                            updateExtracted("brokerageName", mapped);
                          } else if (next === "") {
                            const detected = editedPayload.source.detectedBrokerage;
                            const autoMapped =
                              detected === "KW"
                                ? "Keller Williams"
                                : detected === "BDH"
                                  ? "Bennion Deville Homes"
                                  : undefined;
                            setBrokerageName(autoMapped ?? editedPayload.extracted.brokerageName ?? "");
                            updateExtracted(
                              "brokerageName",
                              autoMapped ?? editedPayload.extracted.brokerageName ?? undefined
                            );
                          }
                        }}
                        className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      >
                        {BROKERAGE_SELECT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                        Property address
                      </label>
                      <input
                        type="text"
                        value={editedPayload.extracted.propertyAddress ?? ""}
                        onChange={(e) => updateExtracted("propertyAddress", e.target.value || undefined)}
                        className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                        Brokerage
                      </label>
                      <input
                        type="text"
                        value={brokerageName}
                        onChange={(e) => {
                          setSelectedBrokerage("CUSTOM");
                          setBrokerageName(e.target.value);
                          updateExtracted("brokerageName", e.target.value || undefined);
                        }}
                        className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                        Contract date
                      </label>
                      <input
                        type="date"
                        value={editedPayload.extracted.contractDate ?? ""}
                        onChange={(e) => updateExtracted("contractDate", e.target.value || undefined)}
                        className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                        Close date
                      </label>
                      <input
                        type="date"
                        value={closingDate}
                        onChange={(e) => {
                          setClosingDate(e.target.value);
                          updateExtracted("closeDate", e.target.value || undefined);
                        }}
                        className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                        Expiration date
                      </label>
                      <input
                        type="date"
                        value={editedPayload.extracted.expirationDate ?? ""}
                        onChange={(e) => updateExtracted("expirationDate", e.target.value || undefined)}
                        className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                        Buyers
                      </label>
                      <textarea
                        rows={2}
                        value={partiesToInput(editedPayload.extracted.buyers)}
                        onChange={(e) => updateExtracted("buyers", inputToParties(e.target.value))}
                        className="w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                        Sellers
                      </label>
                      <textarea
                        rows={2}
                        value={partiesToInput(editedPayload.extracted.sellers)}
                        onChange={(e) => updateExtracted("sellers", inputToParties(e.target.value))}
                        className="w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                        Sale price
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={salePrice}
                        onChange={(e) => {
                          setSalePrice(e.target.value);
                          updateExtracted("salePrice", parseNumberInput(e.target.value));
                        }}
                        className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                        Gross commission
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatNumberInput(editedPayload.extracted.grossCommission)}
                        onChange={(e) => updateExtracted("grossCommission", parseNumberInput(e.target.value))}
                        className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                        Brokerage fees
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatNumberInput(editedPayload.extracted.brokerageFeesTotal)}
                        onChange={(e) =>
                          updateExtracted("brokerageFeesTotal", parseNumberInput(e.target.value))
                        }
                        className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                        Deductions
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatNumberInput(editedPayload.extracted.deductionsTotal)}
                        onChange={(e) => updateExtracted("deductionsTotal", parseNumberInput(e.target.value))}
                        className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                        Net to agent
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatNumberInput(editedPayload.extracted.netToAgent)}
                        onChange={(e) => updateExtracted("netToAgent", parseNumberInput(e.target.value))}
                        className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                      Notes (optional)
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                        Confidence
                      </p>
                      <p className="mt-1 text-sm text-kp-on-surface">
                        {Math.round(editedPayload.scoring.overallConfidence * 100)}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                        Missing required
                      </p>
                      {editedPayload.scoring.missingRequired.length > 0 ? (
                        <ul className="mt-1 space-y-1">
                          {editedPayload.scoring.missingRequired.map((field) => (
                            <li key={field} className="text-sm text-red-300">
                              {prettyFieldName(field)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-sm text-kp-on-surface">None</p>
                      )}
                    </div>
                  </div>

                  {editedPayload.scoring.missingRequired.length > 0 && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-red-300">
                        Action required before commit
                      </p>
                      <p className="mt-1 text-sm text-red-200">
                        Add {editedPayload.scoring.missingRequired.map(prettyFieldName).join(", ")} to
                        complete this import.
                      </p>
                    </div>
                  )}

                  {lowConfidenceFields.length > 0 && (
                    <div className="rounded-lg border border-kp-outline bg-kp-surface-high px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                        Low confidence fields
                      </p>
                      <ul className="mt-1 space-y-1">
                        {lowConfidenceFields.map((item) => (
                          <li key={item.field} className="text-sm text-kp-on-surface-variant">
                            {item.label} ({Math.round(item.confidence * 100)}%)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {editedPayload.scoring.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                        Warnings
                      </p>
                      <ul className="mt-1 space-y-1">
                        {editedPayload.scoring.warnings.map((warning, idx) => (
                          <li key={`${warning}-${idx}`} className="text-sm text-amber-200">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {parseError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <p className="text-sm text-red-400">{parseError}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-kp-outline px-6 py-4">
              <p className="text-xs text-kp-on-surface-variant">
                {!selectedProperty
                  ? "Select a property to continue."
                  : !editedPayload
                  ? "Upload a PDF to generate preview."
                  : importCommitBlockReason
                  ? importCommitBlockReason
                  : "Review edits, then commit import."}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={committing}
                  className="rounded-lg px-4 py-2 text-sm text-kp-on-surface-variant transition-colors hover:bg-kp-surface-high hover:text-kp-on-surface disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleCommitImport()}
                  disabled={!canCommitImport}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-colors",
                    canCommitImport
                      ? "bg-kp-gold text-kp-bg hover:bg-kp-gold-bright"
                      : "cursor-not-allowed bg-kp-surface-high text-kp-on-surface-variant"
                  )}
                >
                  {committing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {committing ? "Committing..." : "Commit import"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

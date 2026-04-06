"use client";

import useSWR from "swr";
import { apiFetcher } from "@/lib/fetcher";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  Plus,
  Save,
  X,
  Briefcase,
  ExternalLink,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getImportProvenance,
  getTransactionSetupGaps,
  setupGapLabel,
} from "./transactions-shared";
import { toast } from "sonner";
import { BrandSkeleton } from "@/components/ui/BrandSkeleton";

// ── Types ─────────────────────────────────────────────────────────────────────

type TxStatus =
  | "LEAD"
  | "UNDER_CONTRACT"
  | "IN_ESCROW"
  | "PENDING"
  | "CLOSED"
  | "FALLEN_APART";

type CommissionRow = {
  id: string;
  transactionId: string;
  agentId: string | null;
  role: string;
  amount: string | number;
  percent: string | number | null;
  notes: string | null;
  createdAt: string;
};

type DealStatus =
  | "INTERESTED"
  | "SHOWING"
  | "OFFER"
  | "NEGOTIATION"
  | "UNDER_CONTRACT"
  | "CLOSED"
  | "LOST";

type LinkedDealSummary = {
  id: string;
  status: DealStatus;
  contact: { id: string; firstName: string; lastName: string };
};

type DealCandidateRow = {
  id: string;
  status: DealStatus;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    status: string | null;
  };
  linkedTransaction?: { id: string } | null;
};

const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  INTERESTED: "Interested",
  SHOWING: "Showing",
  OFFER: "Offer",
  NEGOTIATION: "Negotiating",
  UNDER_CONTRACT: "Under Contract",
  CLOSED: "Closed",
  LOST: "Lost",
};

function dealStatusBadgeVariant(
  s: DealStatus
): ComponentProps<typeof StatusBadge>["variant"] {
  switch (s) {
    case "INTERESTED":
      return "pending";
    case "SHOWING":
      return "upcoming";
    case "OFFER":
      return "active";
    case "NEGOTIATION":
      return "live";
    case "UNDER_CONTRACT":
      return "sold";
    case "CLOSED":
      return "closed";
    case "LOST":
      return "cancelled";
  }
}

type TransactionDetail = {
  id: string;
  status: TxStatus;
  deletedAt: string | null;
  salePrice: string | number | null;
  closingDate: string | null;
  brokerageName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  dealId: string | null;
  deal: LinkedDealSummary | null;
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
  };
  commissions: CommissionRow[];
  committedImportSessions?: Array<{
    id: string;
    fileName: string;
    selectedBrokerage: string | null;
    detectedBrokerage: string | null;
    parserProfile: string;
    parserProfileVersion: string;
    createdAt: string;
  }>;
};

const STATUS_OPTIONS: { value: TxStatus; label: string }[] = [
  { value: "LEAD", label: "Lead" },
  { value: "PENDING", label: "Pending" },
  { value: "UNDER_CONTRACT", label: "Under contract" },
  { value: "IN_ESCROW", label: "In escrow" },
  { value: "CLOSED", label: "Closed" },
  { value: "FALLEN_APART", label: "Fallen apart" },
];

const STATUS_LABELS: Record<TxStatus, string> = {
  LEAD: "Lead",
  UNDER_CONTRACT: "Under contract",
  IN_ESCROW: "In escrow",
  PENDING: "Pending",
  CLOSED: "Closed",
  FALLEN_APART: "Fallen apart",
};

function statusBadgeVariant(
  s: TxStatus
): ComponentProps<typeof StatusBadge>["variant"] {
  switch (s) {
    case "LEAD":
      return "pending";
    case "PENDING":
      return "upcoming";
    case "UNDER_CONTRACT":
      return "sold";
    case "IN_ESCROW":
      return "live";
    case "CLOSED":
      return "closed";
    case "FALLEN_APART":
      return "cancelled";
  }
}

function formatMoneyDisplay(v: string | number | null | undefined) {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function isoToDateInput(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function salePriceToInput(v: string | number | null) {
  if (v == null || v === "") return "";
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isNaN(n) ? "" : String(n);
}

function parseOptionalPrice(s: string): number | null | undefined {
  const t = s.trim().replace(/,/g, "");
  if (!t) return null;
  const n = parseFloat(t);
  if (Number.isNaN(n) || n <= 0) return undefined;
  return n;
}

function parseCommissionAmount(s: string): number | undefined {
  const t = s.trim().replace(/,/g, "");
  if (!t) return undefined;
  const n = parseFloat(t);
  if (Number.isNaN(n) || n <= 0) return undefined;
  return n;
}

function parsePercent(s: string): number | null | undefined {
  const t = s.trim();
  if (!t) return null;
  const n = parseFloat(t);
  if (Number.isNaN(n) || n < 0 || n > 100) return undefined;
  return n;
}

function formatTimestamp(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="min-h-full rounded-2xl bg-kp-bg pb-10">
      <div className="px-6 pt-3 sm:px-8">
        <BrandSkeleton className="h-4 w-24" />
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <BrandSkeleton className="h-8 w-36" />
            <BrandSkeleton className="h-5 w-24 rounded-full" />
          </div>
          <BrandSkeleton className="h-4 w-64" />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <BrandSkeleton className="h-28 w-full rounded-xl" />
          <BrandSkeleton className="h-28 w-full rounded-xl" />
          <BrandSkeleton className="h-28 w-full rounded-xl" />
        </div>
        <div className="mt-4 flex flex-col gap-4">
          <BrandSkeleton className="h-40 w-full rounded-xl" />
          <BrandSkeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function TransactionDetailView({ transactionId }: { transactionId: string }) {
  const { data: txn, error: loadError, isLoading, mutate: reloadTxn } = useSWR<TransactionDetail>(
    transactionId ? `/api/v1/transactions/${transactionId}` : null,
    apiFetcher,
    { errorRetryCount: 2, errorRetryInterval: 500 }
  );
  const loading = isLoading && !txn;
  const error = loadError instanceof Error ? loadError.message : loadError ? String(loadError) : null;

  const { data: linkedDeals, isLoading: dealCandidatesLoading } = useSWR<DealCandidateRow[]>(
    txn && !txn.dealId && txn.property?.id ? `/api/v1/deals?propertyId=${encodeURIComponent(txn.property.id)}` : null,
    apiFetcher
  );
  const dealCandidates = linkedDeals ?? [];

  const [status, setStatus] = useState<TxStatus>("PENDING");
  const [salePriceInput, setSalePriceInput] = useState("");
  const [closingInput, setClosingInput] = useState("");
  const [brokerageInput, setBrokerageInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [newRole, setNewRole] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newPercent, setNewPercent] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [commissionError, setCommissionError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPercent, setEditPercent] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [selectedDealId, setSelectedDealId] = useState("");
  const [dealLinkError, setDealLinkError] = useState<string | null>(null);
  const [dealLinkBusy, setDealLinkBusy] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState<"archive" | "unarchive" | "delete" | null>(
    null
  );

  const selectableDeals = useMemo(
    () =>
      dealCandidates.filter(
        (d) => !d.linkedTransaction || d.linkedTransaction.id === transactionId
      ),
    [dealCandidates, transactionId]
  );
  const importProvenance = useMemo(() => getImportProvenance(txn?.notes), [txn?.notes]);
  const setupGaps = useMemo(
    () => (txn ? getTransactionSetupGaps(txn) : []),
    [txn]
  );

  useEffect(() => {
    if (!txn) return;
    setStatus(txn.status);
    setSalePriceInput(salePriceToInput(txn.salePrice));
    setClosingInput(isoToDateInput(txn.closingDate));
    setBrokerageInput(txn.brokerageName ?? "");
    setNotesInput(txn.notes ?? "");
    setDirty(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txn?.id]);

  useEffect(() => {
    if (!txn) return;
    const changed =
      status !== txn.status ||
      salePriceInput !== salePriceToInput(txn.salePrice) ||
      closingInput !== isoToDateInput(txn.closingDate) ||
      brokerageInput !== (txn.brokerageName ?? "") ||
      notesInput !== (txn.notes ?? "");
    setDirty(changed);
  }, [txn, status, salePriceInput, closingInput, brokerageInput, notesInput]);

  const patchDealLink = async (dealId: string | null) => {
    setDealLinkBusy(true);
    setDealLinkError(null);
    try {
      const res = await fetch(`/api/v1/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Update failed");
      await reloadTxn();
      setSelectedDealId("");
    } catch (e) {
      setDealLinkError(e instanceof Error ? e.message : "Link update failed");
    } finally {
      setDealLinkBusy(false);
    }
  };

  const handleSaveTransaction = async () => {
    if (!txn) return;

    const body: Record<string, unknown> = { status };

    const price = parseOptionalPrice(salePriceInput);
    if (price === undefined) {
      toast.error("Enter a valid sale price or leave blank to clear.");
      return;
    }
    body.salePrice = price;

    if (closingInput.trim()) {
      body.closingDate = closingInput.trim();
    } else {
      body.closingDate = null;
    }

    body.brokerageName = brokerageInput.trim() ? brokerageInput.trim() : null;
    body.notes = notesInput.trim() ? notesInput.trim() : null;

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      const t: TransactionDetail = json.data;
      await reloadTxn(t, false);
      setStatus(t.status);
      setSalePriceInput(salePriceToInput(t.salePrice));
      setClosingInput(isoToDateInput(t.closingDate));
      setBrokerageInput(t.brokerageName ?? "");
      setNotesInput(t.notes ?? "");
      setDirty(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommissionError(null);
    const amount = parseCommissionAmount(newAmount);
    if (!newRole.trim() || amount === undefined) {
      setCommissionError("Role and a positive amount are required.");
      return;
    }

    const payload: Record<string, unknown> = {
      role: newRole.trim(),
      amount,
    };

    const p = parsePercent(newPercent);
    if (p === undefined) {
      setCommissionError("Percent must be between 0 and 100.");
      return;
    }
    if (newPercent.trim()) payload.percent = p;

    if (newNotes.trim()) payload.notes = newNotes.trim();

    setAdding(true);
    try {
      const res = await fetch(`/api/v1/transactions/${transactionId}/commissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setNewRole("");
      setNewAmount("");
      setNewPercent("");
      setNewNotes("");
      await reloadTxn();
    } catch (err) {
      setCommissionError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (c: CommissionRow) => {
    setEditingId(c.id);
    setEditRole(c.role);
    setEditAmount(String(typeof c.amount === "string" ? parseFloat(c.amount) : c.amount));
    setEditPercent(
      c.percent != null && c.percent !== ""
        ? String(typeof c.percent === "string" ? parseFloat(c.percent) : c.percent)
        : ""
    );
    setEditNotes(c.notes ?? "");
    setCommissionError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (commissionId: string) => {
    const amount = parseCommissionAmount(editAmount);
    if (!editRole.trim() || amount === undefined) {
      setCommissionError("Role and a positive amount are required.");
      return;
    }

    const payload: Record<string, unknown> = {
      role: editRole.trim(),
      amount,
    };

    const p = parsePercent(editPercent);
    if (p === undefined && editPercent.trim()) {
      setCommissionError("Percent must be between 0 and 100.");
      return;
    }
    payload.percent = editPercent.trim() ? p : null;

    payload.notes = editNotes.trim() ? editNotes.trim() : null;

    setEditSaving(true);
    setCommissionError(null);
    try {
      const res = await fetch(
        `/api/v1/transactions/${transactionId}/commissions/${commissionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setEditingId(null);
      await reloadTxn();
    } catch (err) {
      setCommissionError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (commissionId: string) => {
    if (!confirm("Remove this commission line?")) return;
    setCommissionError(null);
    try {
      const res = await fetch(
        `/api/v1/transactions/${transactionId}/commissions/${commissionId}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      await reloadTxn();
    } catch (err) {
      setCommissionError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleArchiveTransaction = async () => {
    setLifecycleBusy("archive");
    try {
      const res = await fetch(`/api/v1/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: true }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Archive failed");
      await reloadTxn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Archive failed");
    } finally {
      setLifecycleBusy(null);
    }
  };

  const handleRestoreTransaction = async () => {
    setLifecycleBusy("unarchive");
    try {
      const res = await fetch(`/api/v1/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unarchive: true }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Restore failed");
      await reloadTxn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setLifecycleBusy(null);
    }
  };

  const handleDeleteTransaction = async () => {
    const confirmed = prompt("Type DELETE to permanently remove this transaction.");
    if (confirmed !== "DELETE") return;

    setLifecycleBusy("delete");
    try {
      const res = await fetch(`/api/v1/transactions/${transactionId}?force=1`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Delete failed");
      window.location.href = "/transactions";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
      setLifecycleBusy(null);
    }
  };

  if (loading) return <LoadingState />;

  if (error || !txn) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl bg-kp-bg px-6">
        <AlertCircle className="h-6 w-6 text-red-400" />
        <p className="text-sm text-kp-on-surface-variant">{error ?? "Not found"}</p>
        <Link
          href="/transactions"
          className="text-sm font-medium text-kp-teal underline-offset-2 hover:underline"
        >
          Back to transactions
        </Link>
      </div>
    );
  }

  const importSession = txn.committedImportSessions?.[0] ?? null;
  const importedAt = formatTimestamp(importSession?.createdAt);

  return (
    <div className="min-h-full rounded-2xl bg-kp-bg pb-10">
      <div className="px-6 pt-3 sm:px-8">
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1.5 text-sm text-kp-on-surface-variant transition-colors hover:text-kp-teal"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Transactions
        </Link>

        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-headline text-[1.5rem] font-semibold text-kp-on-surface">
              Transaction
            </h1>
            <StatusBadge variant={statusBadgeVariant(txn.status)}>
              {STATUS_LABELS[txn.status]}
            </StatusBadge>
          </div>
          <p className="mt-1 text-sm font-medium text-kp-on-surface">
            {txn.property.address1}
            <span className="font-normal text-kp-on-surface-variant">
              {" "}
              · {txn.property.city}, {txn.property.state} {txn.property.zip}
            </span>
          </p>
          {txn.deletedAt && (
            <p className="mt-2 inline-flex rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">
              Archived transaction
            </p>
          )}
        </div>
      </div>

      <div className="mx-6 mt-6 space-y-6 sm:mx-8">
        <section className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <h2 className="text-sm font-semibold text-kp-on-surface">Record links</h2>
          <p className="mt-1 text-xs text-kp-on-surface-variant">
            This closing is always tied to one property. A CRM deal is optional; the buyer/seller contact
            comes from that deal, not directly from the transaction.
          </p>
          <ul className="mt-4 divide-y divide-kp-outline-variant">
            <li className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                    Property
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-kp-on-surface">{txn.property.address1}</p>
                  <p className="text-xs text-kp-on-surface-variant">
                    {txn.property.city}, {txn.property.state} {txn.property.zip}
                  </p>
                </div>
              </div>
              <Link
                href={`/properties/${txn.property.id}`}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-kp-teal underline-offset-2 hover:underline"
              >
                Open property
                <ExternalLink className="h-3 w-3 opacity-70" />
              </Link>
            </li>
            <li className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-2">
                <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                    CRM deal
                  </p>
                  {txn.deal ? (
                    <p className="mt-0.5 text-sm text-kp-on-surface">
                      <StatusBadge variant={dealStatusBadgeVariant(txn.deal.status)}>
                        {DEAL_STATUS_LABELS[txn.deal.status]}
                      </StatusBadge>
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm text-kp-on-surface-variant">Not linked</p>
                  )}
                </div>
              </div>
              {txn.deal ? (
                <Link
                  href={`/deals/${txn.deal.id}`}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-kp-teal underline-offset-2 hover:underline"
                >
                  Open deal
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </Link>
              ) : null}
            </li>
            <li className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-2">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                    Contact (via deal)
                  </p>
                  {txn.deal ? (
                    <p className="mt-0.5 text-sm font-medium text-kp-on-surface">
                      {[txn.deal.contact.firstName, txn.deal.contact.lastName].filter(Boolean).join(" ") ||
                        "—"}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm text-kp-on-surface-variant">
                      Link a CRM deal below to connect this closing to a contact.
                    </p>
                  )}
                </div>
              </div>
              {txn.deal ? (
                <Link
                  href={`/contacts/${txn.deal.contact.id}`}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-kp-teal underline-offset-2 hover:underline"
                >
                  Open contact
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </Link>
              ) : null}
            </li>
          </ul>
        </section>

        {setupGaps.length > 0 ? (
          <section className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-300">
              Needs setup
            </p>
            <p className="mt-1 text-sm text-rose-100">
              Fill {setupGaps.map((gap) => setupGapLabel(gap)).join(", ")} to complete this
              transaction record.
            </p>
          </section>
        ) : null}

        {importProvenance ? (
          <section className="rounded-xl border border-kp-teal/30 bg-kp-teal/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-kp-teal">
              Imported provenance
            </p>
            <p className="mt-1 text-sm text-kp-on-surface">
              Source statement: <span className="font-medium">{importProvenance.sourceFile}</span>
            </p>
            <p className="mt-1 text-xs text-kp-on-surface-variant">
              Imported transaction created {formatTimestamp(txn.createdAt)}.
            </p>
          </section>
        ) : null}

        <section className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Briefcase className="h-4 w-4 text-kp-on-surface-variant" />
            <h2 className="text-sm font-semibold text-kp-on-surface">Link or change CRM deal</h2>
          </div>
          <p className="mt-0.5 text-xs text-kp-on-surface-variant">
            Choose a deal on this same property. That deal&apos;s contact is what ties people to this
            closing (see Record links above).
          </p>

          {dealLinkError && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {dealLinkError}
            </div>
          )}

          {txn.deal ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-kp-on-surface-variant">
                Linked to the deal above. Unlink to choose a different deal for this property.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/deals/${txn.deal.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-1.5 text-xs font-medium text-kp-teal hover:bg-kp-teal/10"
                >
                  Open deal
                  <ExternalLink className="h-3 w-3" />
                </Link>
                <button
                  type="button"
                  disabled={dealLinkBusy}
                  onClick={() => {
                    if (!confirm("Remove the CRM deal link from this transaction?")) return;
                    void patchDealLink(null);
                  }}
                  className={cn(
                    "rounded-lg border border-kp-outline px-3 py-1.5 text-xs font-medium",
                    "text-kp-on-surface-variant hover:bg-kp-surface-high hover:text-kp-on-surface",
                    "disabled:pointer-events-none disabled:opacity-50"
                  )}
                >
                  Unlink
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {dealCandidatesLoading ? (
                <div className="flex items-center gap-2 text-sm text-kp-on-surface-variant">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading deals for this property…
                </div>
              ) : selectableDeals.length === 0 ? (
                <p className="text-sm text-kp-on-surface-variant">
                  No linkable deals on this property yet. Create a deal from ClientKeep, then link it
                  here.
                </p>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <label
                      htmlFor="txn-link-deal"
                      className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted"
                    >
                      Deal to link
                    </label>
                    <select
                      id="txn-link-deal"
                      value={selectedDealId}
                      onChange={(e) => setSelectedDealId(e.target.value)}
                      className={cn(
                        "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface",
                        "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      )}
                    >
                      <option value="">Select a deal…</option>
                      {selectableDeals.map((d) => (
                        <option key={d.id} value={d.id}>
                          {[d.contact.firstName, d.contact.lastName].filter(Boolean).join(" ") ||
                            "Unknown"}{" "}
                          — {DEAL_STATUS_LABELS[d.status]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={!selectedDealId || dealLinkBusy}
                    onClick={() => selectedDealId && void patchDealLink(selectedDealId)}
                    className={cn(
                      "inline-flex h-9 shrink-0 items-center justify-center rounded-lg px-4 text-sm font-semibold",
                      selectedDealId && !dealLinkBusy
                        ? "bg-kp-teal/20 text-kp-teal hover:bg-kp-teal/30"
                        : "cursor-not-allowed bg-kp-surface-high text-kp-on-surface-variant"
                    )}
                  >
                    {dealLinkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link deal"}
                  </button>
                </div>
              )}
              <Link
                href="/deals"
                className="inline-flex text-xs font-medium text-kp-teal underline-offset-2 hover:underline"
              >
                Go to deals list
              </Link>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <h2 className="text-sm font-semibold text-kp-on-surface">Transaction details</h2>
          <p className="mt-0.5 text-xs text-kp-on-surface-variant">
            Changes save to this closing record only.
          </p>

          {importSession && (
            <div className="mt-4 rounded-lg border border-kp-teal/20 bg-kp-teal/10 px-3 py-2">
              <p className="text-xs font-semibold text-kp-teal">
                Imported from commission statement
              </p>
              <p className="mt-0.5 text-xs text-kp-on-surface-variant">
                {importSession.fileName} · Profile {importSession.parserProfile} (
                {importSession.parserProfileVersion})
                {importSession.selectedBrokerage
                  ? ` · Brokerage ${importSession.selectedBrokerage}`
                  : importSession.detectedBrokerage
                    ? ` · Detected ${importSession.detectedBrokerage}`
                    : ""}
                {importedAt ? ` · Imported ${importedAt}` : ""}
              </p>
            </div>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="detail-status" className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                Status
              </label>
              <select
                id="detail-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TxStatus)}
                className={cn(
                  "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface",
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

            <div className="space-y-1.5">
              <label htmlFor="detail-price" className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                Sale price
              </label>
              <input
                id="detail-price"
                type="text"
                inputMode="decimal"
                value={salePriceInput}
                onChange={(e) => setSalePriceInput(e.target.value)}
                placeholder="Optional"
                className={cn(
                  "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm",
                  "text-kp-on-surface placeholder:text-kp-on-surface-placeholder",
                  "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="detail-close" className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                Closing date
              </label>
              <input
                id="detail-close"
                type="date"
                value={closingInput}
                onChange={(e) => setClosingInput(e.target.value)}
                className={cn(
                  "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface",
                  "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                )}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="detail-brokerage" className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                Brokerage
              </label>
              <input
                id="detail-brokerage"
                type="text"
                value={brokerageInput}
                onChange={(e) => setBrokerageInput(e.target.value)}
                className={cn(
                  "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm",
                  "text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                )}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="detail-notes" className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                Notes
              </label>
              <textarea
                id="detail-notes"
                rows={3}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm",
                  "text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                )}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={() => {
                setStatus(txn.status);
                setSalePriceInput(salePriceToInput(txn.salePrice));
                setClosingInput(isoToDateInput(txn.closingDate));
                setBrokerageInput(txn.brokerageName ?? "");
                setNotesInput(txn.notes ?? "");
              }}
              className={cn(
                "rounded-lg px-4 py-2 text-sm text-kp-on-surface-variant",
                "hover:bg-kp-surface-high hover:text-kp-on-surface",
                "disabled:pointer-events-none disabled:opacity-40"
              )}
            >
              Reset
            </button>
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={handleSaveTransaction}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                dirty && !saving
                  ? "bg-kp-gold text-kp-bg hover:bg-kp-gold-bright"
                  : "cursor-not-allowed bg-kp-surface-high text-kp-on-surface-variant"
              )}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <h2 className="text-sm font-semibold text-kp-on-surface">Transaction lifecycle</h2>
          <p className="mt-0.5 text-xs text-kp-on-surface-variant">
            Archive hides this record from default lists. Delete is permanent.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {!txn.deletedAt ? (
              <button
                type="button"
                disabled={lifecycleBusy !== null}
                onClick={() => void handleArchiveTransaction()}
                className={cn(
                  "rounded-lg border border-kp-outline px-3 py-2 text-xs font-semibold text-kp-on-surface",
                  "hover:bg-kp-surface-high disabled:opacity-50"
                )}
              >
                {lifecycleBusy === "archive" ? "Archiving..." : "Archive transaction"}
              </button>
            ) : (
              <button
                type="button"
                disabled={lifecycleBusy !== null}
                onClick={() => void handleRestoreTransaction()}
                className={cn(
                  "rounded-lg border border-kp-outline px-3 py-2 text-xs font-semibold text-kp-on-surface",
                  "hover:bg-kp-surface-high disabled:opacity-50"
                )}
              >
                {lifecycleBusy === "unarchive" ? "Restoring..." : "Restore transaction"}
              </button>
            )}
            <button
              type="button"
              disabled={lifecycleBusy !== null}
              onClick={() => void handleDeleteTransaction()}
              className={cn(
                "rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300",
                "hover:bg-red-500/10 disabled:opacity-50"
              )}
            >
              {lifecycleBusy === "delete" ? "Deleting..." : "Delete permanently"}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <h2 className="text-sm font-semibold text-kp-on-surface">Commissions</h2>
          <p className="mt-0.5 text-xs text-kp-on-surface-variant">
            Splits on this transaction. Co-agent visibility is handled when their user is set on a line.
          </p>

          {commissionError && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {commissionError}
            </div>
          )}

          {txn.commissions.length === 0 ? (
            <p className="mt-4 text-sm text-kp-on-surface-variant">No commission lines yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-kp-outline-variant">
              {txn.commissions.map((c) => (
                <li key={c.id} className="py-3 first:pt-0">
                  {editingId === c.id ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="h-9 rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm"
                        placeholder="Role"
                      />
                      <input
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="h-9 rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm"
                        placeholder="Amount"
                        inputMode="decimal"
                      />
                      <input
                        value={editPercent}
                        onChange={(e) => setEditPercent(e.target.value)}
                        className="h-9 rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm"
                        placeholder="% (optional)"
                        inputMode="decimal"
                      />
                      <input
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="h-9 rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm sm:col-span-2"
                        placeholder="Notes"
                      />
                      <div className="flex gap-2 sm:col-span-2">
                        <button
                          type="button"
                          disabled={editSaving}
                          onClick={() => saveEdit(c.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-kp-teal/20 px-3 py-1.5 text-xs font-semibold text-kp-teal"
                        >
                          {editSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          Save line
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-kp-on-surface-variant"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-kp-on-surface">{c.role}</p>
                        <p className="text-sm text-kp-on-surface-variant">
                          {formatMoneyDisplay(c.amount)}
                          {percentDisplay(c.percent) != null && (
                            <span className="ml-2 text-xs">
                              ({percentDisplay(c.percent)}%)
                            </span>
                          )}
                        </p>
                        {c.notes && (
                          <p className="mt-1 text-xs text-kp-on-surface-variant">{c.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="rounded-lg p-2 text-kp-on-surface-variant hover:bg-kp-surface-high hover:text-kp-teal"
                          aria-label="Edit commission"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="rounded-lg p-2 text-kp-on-surface-variant hover:bg-kp-surface-high hover:text-red-400"
                          aria-label="Delete commission"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddCommission} className="mt-4 border-t border-kp-outline pt-4">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-kp-on-surface-muted">
              <Plus className="h-3.5 w-3.5" />
              Add line
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Role (e.g. Listing agent)"
                className="h-9 rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm"
              />
              <input
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="Amount"
                inputMode="decimal"
                className="h-9 rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm"
              />
              <input
                value={newPercent}
                onChange={(e) => setNewPercent(e.target.value)}
                placeholder="% optional"
                inputMode="decimal"
                className="h-9 rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm"
              />
              <input
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Notes optional"
                className="h-9 rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm sm:col-span-2"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-kp-gold px-4 py-2 text-sm font-semibold text-kp-bg hover:bg-kp-gold-bright disabled:opacity-50"
            >
              {adding && <Loader2 className="h-4 w-4 animate-spin" />}
              Add commission
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function percentDisplay(v: string | number | null) {
  if (v === "" || v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return null;
  return n;
}

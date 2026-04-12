"use client";

import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSWRConfig } from "swr";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  Plus,
  Save,
  X,
  Briefcase,
  ExternalLink,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { computeDetailLivePreview } from "@/lib/transactions/detail-financial-preview";
import { parseOptionalFiniteNumberInput } from "@/lib/transactions/parse-optional-finite-number-input";
import { TransactionDetailActionsMenu } from "@/components/modules/transactions/transaction-detail-actions-menu";
import { useTransactionHqChromeOptional } from "@/components/modules/transactions/transaction-hq-chrome-context";

// ── Types ─────────────────────────────────────────────────────────────────────

type TxStatus =
  | "LEAD"
  | "UNDER_CONTRACT"
  | "IN_ESCROW"
  | "PENDING"
  | "CLOSED"
  | "FALLEN_APART";

type TxKind = "SALE" | "REFERRAL_RECEIVED";

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
  side?: "BUY" | "SELL" | null;
  transactionKind: TxKind;
  primaryContactId: string | null;
  primaryContact: { id: string; firstName: string; lastName: string } | null;
  externalSource: string | null;
  externalSourceId: string | null;
  commissionInputs: Record<string, unknown> | null;
  gci: number | null;
  adjustedGci: number | null;
  referralDollar: number | null;
  totalBrokerageFees: number | null;
  nci: number | null;
  netVolume: number | null;
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
};

const STATUS_OPTIONS: { value: TxStatus; label: string }[] = [
  { value: "LEAD", label: "Lead" },
  { value: "PENDING", label: "Pending" },
  { value: "UNDER_CONTRACT", label: "Under contract" },
  { value: "IN_ESCROW", label: "In escrow" },
  { value: "CLOSED", label: "Closed" },
  { value: "FALLEN_APART", label: "Fallen apart" },
];

function formatMoneyDisplay(v: string | number | null | undefined) {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function formatMoneyHero(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** Actionable copy for the workspace; list still uses "Needs …" from the shared gate. */
function detailPreviewHint(listMessage: string): string {
  if (listMessage === "Needs sale price") return "Add sale price to preview breakdown";
  if (listMessage === "Needs commission %") return "Add commission % to preview breakdown";
  if (listMessage === "Needs referral fee") return "Add referral fee to preview breakdown";
  return "Financial inputs incomplete";
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

// ── Main ──────────────────────────────────────────────────────────────────────

/** Full financial editor, record, CRM deal link, and commission splits — `/transactions/[id]/financial`. */
export function TransactionFinancialWorkspace({ transactionId }: { transactionId: string }) {
  const { mutate } = useSWRConfig();
  const refreshTransactionActivity = useCallback(
    () => mutate(`/api/v1/transactions/${transactionId}/activity`),
    [mutate, transactionId]
  );
  const scrollToActivityNote = useCallback(() => {
    const el =
      typeof document !== "undefined" ? document.getElementById("txn-activity-note") : null;
    el?.focus();
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const [txn, setTxn] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<TxStatus>("PENDING");
  const [transactionKind, setTransactionKind] = useState<TxKind>("SALE");
  const [primaryContactIdInput, setPrimaryContactIdInput] = useState("");
  const [externalSourceInput, setExternalSourceInput] = useState("");
  const [externalSourceIdInput, setExternalSourceIdInput] = useState("");
  const [commissionPctInput, setCommissionPctInput] = useState("");
  const [referralPctInput, setReferralPctInput] = useState("");
  const [referralFeeReceivedInput, setReferralFeeReceivedInput] = useState("");
  const [nciOverrideInput, setNciOverrideInput] = useState("");
  const [salePriceInput, setSalePriceInput] = useState("");
  const [closingInput, setClosingInput] = useState("");
  const [brokerageInput, setBrokerageInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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

  const [dealCandidates, setDealCandidates] = useState<DealCandidateRow[]>([]);
  const [dealCandidatesLoading, setDealCandidatesLoading] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState("");
  const [dealLinkError, setDealLinkError] = useState<string | null>(null);
  const [dealLinkBusy, setDealLinkBusy] = useState(false);

  const selectableDeals = useMemo(
    () =>
      dealCandidates.filter(
        (d) => !d.linkedTransaction || d.linkedTransaction.id === transactionId
      ),
    [dealCandidates, transactionId]
  );

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch(`/api/v1/transactions/${transactionId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error.message ?? "Failed to load");
          setTxn(null);
        } else {
          const t: TransactionDetail = json.data;
          setTxn(t);
          setStatus(t.status);
          setTransactionKind(t.transactionKind ?? "SALE");
          setPrimaryContactIdInput(t.primaryContactId ?? "");
          setExternalSourceInput(t.externalSource ?? "");
          setExternalSourceIdInput(t.externalSourceId ?? "");
          const ci =
            t.commissionInputs && typeof t.commissionInputs === "object" && !Array.isArray(t.commissionInputs)
              ? (t.commissionInputs as Record<string, unknown>)
              : {};
          setCommissionPctInput(
            ci.commissionPct != null && ci.commissionPct !== "" ? String(ci.commissionPct) : ""
          );
          setReferralPctInput(
            ci.referralPct != null && ci.referralPct !== "" ? String(ci.referralPct) : ""
          );
          setReferralFeeReceivedInput(
            ci.referralFeeReceived != null && ci.referralFeeReceived !== ""
              ? String(ci.referralFeeReceived)
              : ""
          );
          setNciOverrideInput(ci.nci != null && ci.nci !== "" ? String(ci.nci) : "");
          setSalePriceInput(salePriceToInput(t.salePrice));
          setClosingInput(isoToDateInput(t.closingDate));
          setBrokerageInput(t.brokerageName ?? "");
          setNotesInput(t.notes ?? "");
          setDirty(false);
          setSaveError(null);
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [transactionId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!txn || txn.dealId) {
      setDealCandidates([]);
      setSelectedDealId("");
      return;
    }
    let cancelled = false;
    setDealCandidatesLoading(true);
    fetch(`/api/v1/deals?propertyId=${encodeURIComponent(txn.property.id)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.data) setDealCandidates(json.data as DealCandidateRow[]);
        else setDealCandidates([]);
      })
      .catch(() => {
        if (!cancelled) setDealCandidates([]);
      })
      .finally(() => {
        if (!cancelled) setDealCandidatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // `txn?.dealId` is listed explicitly so the effect re-runs when a deal is linked/unlinked even if
    // a future code path ever reused a stable `txn` object reference.
  }, [transactionId, txn, txn?.dealId]);

  useEffect(() => {
    if (!txn) return;
    const ci =
      txn.commissionInputs && typeof txn.commissionInputs === "object" && !Array.isArray(txn.commissionInputs)
        ? (txn.commissionInputs as Record<string, unknown>)
        : {};
    const baselinePct =
      ci.commissionPct != null && ci.commissionPct !== "" ? String(ci.commissionPct) : "";
    const baselineRef =
      ci.referralPct != null && ci.referralPct !== "" ? String(ci.referralPct) : "";
    const baselineRefFee =
      ci.referralFeeReceived != null && ci.referralFeeReceived !== ""
        ? String(ci.referralFeeReceived)
        : "";
    const baselineNci = ci.nci != null && ci.nci !== "" ? String(ci.nci) : "";
    const changed =
      status !== txn.status ||
      transactionKind !== (txn.transactionKind ?? "SALE") ||
      primaryContactIdInput !== (txn.primaryContactId ?? "") ||
      externalSourceInput !== (txn.externalSource ?? "") ||
      externalSourceIdInput !== (txn.externalSourceId ?? "") ||
      commissionPctInput !== baselinePct ||
      referralPctInput !== baselineRef ||
      referralFeeReceivedInput !== baselineRefFee ||
      nciOverrideInput !== baselineNci ||
      salePriceInput !== salePriceToInput(txn.salePrice) ||
      closingInput !== isoToDateInput(txn.closingDate) ||
      brokerageInput !== (txn.brokerageName ?? "") ||
      notesInput !== (txn.notes ?? "");
    setDirty(changed);
  }, [
    txn,
    status,
    transactionKind,
    primaryContactIdInput,
    externalSourceInput,
    externalSourceIdInput,
    commissionPctInput,
    referralPctInput,
    referralFeeReceivedInput,
    nciOverrideInput,
    salePriceInput,
    closingInput,
    brokerageInput,
    notesInput,
  ]);

  const draftCommissionInputs = useMemo((): Record<string, unknown> => {
    const ci: Record<string, unknown> = {};
    const pct = parseOptionalFiniteNumberInput(commissionPctInput);
    ci.commissionPct = pct.invalid ? null : pct.value;
    const rp = parseOptionalFiniteNumberInput(referralPctInput);
    ci.referralPct = rp.invalid ? null : rp.value;
    const rf = parseOptionalFiniteNumberInput(referralFeeReceivedInput);
    ci.referralFeeReceived = rf.invalid ? null : rf.value;
    const nciO = parseOptionalFiniteNumberInput(nciOverrideInput);
    ci.nci = nciO.invalid ? null : nciO.value;
    return ci;
  }, [commissionPctInput, referralPctInput, referralFeeReceivedInput, nciOverrideInput]);

  const previewSalePrice = useMemo(() => {
    const t = salePriceInput.trim().replace(/,/g, "");
    if (!t) return null;
    const n = parseFloat(t);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [salePriceInput]);

  const livePreview = useMemo(
    () =>
      computeDetailLivePreview({
        transactionKind,
        salePrice: previewSalePrice,
        brokerageName: brokerageInput.trim() ? brokerageInput.trim() : null,
        commissionInputsJson: draftCommissionInputs,
      }),
    [transactionKind, previewSalePrice, brokerageInput, draftCommissionInputs]
  );

  const hqChrome = useTransactionHqChromeOptional();

  useEffect(() => {
    if (!hqChrome || !txn) return;
    hqChrome.setDetailActions(
      <TransactionDetailActionsMenu
        transactionId={transactionId}
        propertyId={txn.property.id}
        primaryContactId={txn.primaryContactId}
        currentStatus={status}
        menuAlign="end"
        onScrollToNote={scrollToActivityNote}
        onRefreshActivity={() => void refreshTransactionActivity()}
        onReloadTransaction={() => void load()}
      />
    );
    return () => hqChrome.setDetailActions(null);
  }, [
    hqChrome,
    txn,
    transactionId,
    status,
    scrollToActivityNote,
    refreshTransactionActivity,
    load,
  ]);

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
      await load();
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
      setSaveError("Enter a valid sale price or leave blank to clear.");
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
    body.transactionKind = transactionKind;
    body.externalSource = externalSourceInput.trim() ? externalSourceInput.trim() : null;
    body.externalSourceId = externalSourceIdInput.trim() ? externalSourceIdInput.trim() : null;
    const pc = primaryContactIdInput.trim();
    body.primaryContactId = pc ? pc : null;

    const pct = parseOptionalFiniteNumberInput(commissionPctInput);
    const rp = parseOptionalFiniteNumberInput(referralPctInput);
    const rf = parseOptionalFiniteNumberInput(referralFeeReceivedInput);
    const nciO = parseOptionalFiniteNumberInput(nciOverrideInput);
    if (pct.invalid || rp.invalid || rf.invalid || nciO.invalid) {
      setSaveError(
        "Enter valid numbers for commission fields (or leave them blank)."
      );
      return;
    }
    body.commissionInputs = {
      commissionPct: pct.value,
      referralPct: rp.value,
      referralFeeReceived: rf.value,
      nci: nciO.value,
    };

    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/v1/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
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
      await load();
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
      await load();
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
      await load();
    } catch (err) {
      setCommissionError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl bg-kp-bg">
        <Loader2 className="h-6 w-6 animate-spin text-kp-on-surface-variant" />
      </div>
    );
  }

  if (error || !txn) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl bg-kp-bg px-6">
        <AlertCircle className="h-6 w-6 text-red-400" />
        <p className="text-sm text-kp-on-surface-variant">{error ?? "Not found"}</p>
        <Link
          href="/transactions"
          className="text-sm font-medium text-kp-teal underline-offset-2 hover:underline"
        >
          Back to your deals
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-full rounded-2xl bg-kp-bg pb-10">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 pt-3 sm:px-8">
        <Link
          href={`/transactions/${transactionId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-kp-teal transition-colors hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to deal
        </Link>
        <Link
          href="/transactions"
          className="text-sm text-kp-on-surface-variant transition-colors hover:text-kp-teal"
        >
          All deals
        </Link>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 px-6 pb-10 pt-4 sm:px-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
            Financial &amp; records
          </p>
          <h1 className="font-headline mt-1 text-lg font-semibold text-kp-on-surface">
            {txn.property.address1}
          </h1>
          <p className="mt-0.5 text-sm text-kp-on-surface-variant">
            {txn.property.city}, {txn.property.state} {txn.property.zip}
          </p>
        </div>

        <section
          id="txn-financial-context"
          className="rounded-xl border border-kp-outline/70 bg-kp-surface/80 p-4 shadow-none"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-1.5">
              <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-kp-on-surface-variant" />
              <div>
                <h2 className="text-xs font-semibold text-kp-on-surface">Financial context</h2>
                <p className="mt-0.5 text-[11px] leading-snug text-kp-on-surface-variant">
                  Core economics and preview — use Actions for jumps; save when you change inputs.
                </p>
              </div>
            </div>
            {dirty ? (
              <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/[0.06] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-900/90 dark:text-amber-200/90">
                Unsaved
              </span>
            ) : (
              <span className="shrink-0 rounded-full border border-kp-outline/50 bg-kp-surface-high/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                In sync
              </span>
            )}
          </div>

          <div className="mt-3 rounded-md border border-kp-outline/40 bg-kp-surface-high/15 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
              Primary inputs
            </p>
            <div className="mt-2.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5 lg:col-span-1">
                <label
                  htmlFor="ws-tx-kind"
                  className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant"
                >
                  Transaction kind
                </label>
                <select
                  id="ws-tx-kind"
                  value={transactionKind}
                  onChange={(e) => setTransactionKind(e.target.value as TxKind)}
                  className={cn(
                    "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface px-3 text-sm text-kp-on-surface",
                    "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                  )}
                >
                  <option value="SALE">Sale</option>
                  <option value="REFERRAL_RECEIVED">Referral received</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="ws-price"
                  className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant"
                >
                  Sale price
                </label>
                <input
                  id="ws-price"
                  type="text"
                  inputMode="decimal"
                  value={salePriceInput}
                  onChange={(e) => setSalePriceInput(e.target.value)}
                  placeholder={transactionKind === "REFERRAL_RECEIVED" ? "Optional for referral" : "e.g. 500000"}
                  className={cn(
                    "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface px-3 text-sm tabular-nums",
                    "text-kp-on-surface placeholder:text-kp-on-surface-variant",
                    "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="ws-comm-pct"
                  className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant"
                >
                  Commission %
                </label>
                <input
                  id="ws-comm-pct"
                  type="text"
                  inputMode="decimal"
                  value={commissionPctInput}
                  onChange={(e) => setCommissionPctInput(e.target.value)}
                  placeholder="e.g. 3 or 0.03"
                  className={cn(
                    "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface px-3 text-sm",
                    "text-kp-on-surface placeholder:text-kp-on-surface-variant",
                    "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                  )}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                <label
                  htmlFor="ws-brokerage"
                  className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant"
                >
                  Brokerage
                </label>
                <input
                  id="ws-brokerage"
                  type="text"
                  value={brokerageInput}
                  onChange={(e) => setBrokerageInput(e.target.value)}
                  placeholder="e.g. KW, BDH — drives fee rules"
                  className={cn(
                    "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface px-3 text-sm",
                    "text-kp-on-surface placeholder:text-kp-on-surface-variant",
                    "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="ws-close"
                  className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant"
                >
                  Closing date
                </label>
                <input
                  id="ws-close"
                  type="date"
                  value={closingInput}
                  onChange={(e) => setClosingInput(e.target.value)}
                  className={cn(
                    "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface px-3 text-sm text-kp-on-surface",
                    "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                  )}
                />
              </div>
            </div>
          </div>

          <div
            className={cn(
              "mt-3 rounded-lg border p-3",
              dirty && livePreview.status === "ok"
                ? "border-kp-teal/25 bg-kp-teal/[0.04]"
                : "border-kp-outline/40 bg-kp-surface-high/20"
            )}
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                Live preview
              </span>
              {dirty ? (
                <span className="text-[10px] text-kp-on-surface-variant/90">
                  Estimates — save to update stored outputs
                </span>
              ) : (
                <span className="text-[10px] text-kp-on-surface-variant/90">Matches saved calculation</span>
              )}
            </div>

            {livePreview.status === "incomplete" || livePreview.status === "invalid" ? (
              <div className="mt-2.5 rounded-md border border-amber-500/30 bg-amber-500/[0.06] px-2.5 py-2 text-xs text-kp-on-surface">
                {livePreview.status === "incomplete"
                  ? detailPreviewHint(livePreview.message)
                  : livePreview.message}
              </div>
            ) : (
              <>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-md border border-kp-outline/40 bg-kp-surface/60 p-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                      Gross (GCI)
                    </p>
                    <p className="mt-0.5 text-base font-semibold tabular-nums text-kp-on-surface">
                      {formatMoneyHero(livePreview.values.gci)}
                    </p>
                  </div>
                  <div className="rounded-md border border-kp-outline/40 bg-kp-surface/60 p-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                      After referrals
                    </p>
                    <p className="mt-0.5 text-base font-semibold tabular-nums text-kp-on-surface">
                      {formatMoneyHero(livePreview.values.adjustedGci)}
                    </p>
                    {livePreview.values.referralDollar > 0 ? (
                      <p className="mt-0.5 text-[9px] text-kp-on-surface-variant">
                        Referral paid −{formatMoneyDisplay(livePreview.values.referralDollar)}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-md border border-kp-outline/40 bg-kp-surface/60 p-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                      Total fees
                    </p>
                    <p className="mt-0.5 text-base font-semibold tabular-nums text-kp-on-surface">
                      {formatMoneyHero(livePreview.values.totalBrokerageFees)}
                    </p>
                  </div>
                  <div className="rounded-md border border-kp-teal/30 bg-kp-surface/70 p-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                      NCI
                    </p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight text-kp-on-surface">
                      {formatMoneyHero(livePreview.values.nci)}
                    </p>
                    <p className="mt-0.5 text-[9px] text-kp-on-surface-variant">Net commission income</p>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-kp-on-surface-variant">
                  Net volume:{" "}
                  <span className="font-medium text-kp-on-surface/90">{formatMoneyHero(livePreview.values.netVolume)}</span>
                </p>
              </>
            )}

            <div className="mt-3 border-t border-kp-outline/35 pt-2">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                Saved on server
              </p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-kp-on-surface-variant">
                {txn.nci != null || txn.gci != null ? (
                  <>
                    NCI {formatMoneyDisplay(txn.nci)} · After referrals {formatMoneyDisplay(txn.adjustedGci)} · Fees{" "}
                    {formatMoneyDisplay(txn.totalBrokerageFees)} · GCI {formatMoneyDisplay(txn.gci)}
                  </>
                ) : (
                  <>No saved commission outputs yet — complete primary inputs and save.</>
                )}
              </p>
            </div>
          </div>

          <div className="mt-3 border-t border-kp-outline/35 pt-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
              Advanced adjustments
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-kp-on-surface-variant">
              Referral economics and import overrides. These feed the same preview above.
            </p>
            <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="adv-ref-pct"
                  className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant"
                >
                  Referral % of GCI
                </label>
                <input
                  id="adv-ref-pct"
                  type="text"
                  inputMode="decimal"
                  value={referralPctInput}
                  onChange={(e) => setReferralPctInput(e.target.value)}
                  placeholder="Optional"
                  className={cn(
                    "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm",
                    "text-kp-on-surface placeholder:text-kp-on-surface-variant",
                    "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="adv-ref-fee"
                  className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant"
                >
                  Referral fee received
                </label>
                <input
                  id="adv-ref-fee"
                  type="text"
                  inputMode="decimal"
                  value={referralFeeReceivedInput}
                  onChange={(e) => setReferralFeeReceivedInput(e.target.value)}
                  placeholder="Referral received kind"
                  className={cn(
                    "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm",
                    "text-kp-on-surface placeholder:text-kp-on-surface-variant",
                    "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                  )}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label
                  htmlFor="adv-nci"
                  className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant"
                >
                  NCI override (imports)
                </label>
                <input
                  id="adv-nci"
                  type="text"
                  inputMode="decimal"
                  value={nciOverrideInput}
                  onChange={(e) => setNciOverrideInput(e.target.value)}
                  placeholder="Optional; locks net for referral imports"
                  className={cn(
                    "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm",
                    "text-kp-on-surface placeholder:text-kp-on-surface-variant",
                    "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                  )}
                />
              </div>
            </div>
          </div>

          {saveError && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {saveError}
            </div>
          )}

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={() => {
                setStatus(txn.status);
                setTransactionKind(txn.transactionKind ?? "SALE");
                setPrimaryContactIdInput(txn.primaryContactId ?? "");
                setExternalSourceInput(txn.externalSource ?? "");
                setExternalSourceIdInput(txn.externalSourceId ?? "");
                const rci =
                  txn.commissionInputs &&
                  typeof txn.commissionInputs === "object" &&
                  !Array.isArray(txn.commissionInputs)
                    ? (txn.commissionInputs as Record<string, unknown>)
                    : {};
                setCommissionPctInput(
                  rci.commissionPct != null && rci.commissionPct !== ""
                    ? String(rci.commissionPct)
                    : ""
                );
                setReferralPctInput(
                  rci.referralPct != null && rci.referralPct !== "" ? String(rci.referralPct) : ""
                );
                setReferralFeeReceivedInput(
                  rci.referralFeeReceived != null && rci.referralFeeReceived !== ""
                    ? String(rci.referralFeeReceived)
                    : ""
                );
                setNciOverrideInput(rci.nci != null && rci.nci !== "" ? String(rci.nci) : "");
                setSalePriceInput(salePriceToInput(txn.salePrice));
                setClosingInput(isoToDateInput(txn.closingDate));
                setBrokerageInput(txn.brokerageName ?? "");
                setNotesInput(txn.notes ?? "");
                setSaveError(null);
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
              Save financials
            </button>
          </div>
        </section>

        <section
          id="txn-deal-context"
          className="rounded-xl border border-kp-outline/80 bg-kp-surface p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Briefcase className="h-4 w-4 text-kp-on-surface-variant" />
            <h2 className="text-sm font-semibold text-kp-on-surface">CRM deal</h2>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-kp-on-surface-variant">
            Link an existing deal for this property. Only deals you own on this address appear here.
          </p>

          {dealLinkError && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {dealLinkError}
            </div>
          )}

          {txn.deal ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-medium text-kp-on-surface">
                  {[txn.deal.contact.firstName, txn.deal.contact.lastName].filter(Boolean).join(" ") ||
                    "Unknown contact"}
                </p>
                <StatusBadge variant={dealStatusBadgeVariant(txn.deal.status)}>
                  {DEAL_STATUS_LABELS[txn.deal.status]}
                </StatusBadge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/deals/${txn.deal.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-1.5 text-xs font-medium text-kp-teal hover:bg-kp-teal/10"
                >
                  View deal
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
                      className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant"
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

        <section
          id="txn-record-context"
          className="rounded-lg border border-kp-outline/45 bg-kp-surface/50 p-3 shadow-none"
        >
          <h2 className="text-xs font-semibold text-kp-on-surface">Record &amp; context</h2>
          <p className="mt-0.5 text-[11px] leading-snug text-kp-on-surface-variant">
            Pipeline status, client link, and notes.{" "}
            <span className="font-medium text-kp-on-surface/90">Save changes</span> persists fields on this
            page, including financial inputs above.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="detail-status" className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
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

            <div className="space-y-1.5 sm:col-span-2">
              <label
                htmlFor="detail-primary-contact"
                className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant"
              >
                Primary contact ID (optional)
              </label>
              <input
                id="detail-primary-contact"
                type="text"
                value={primaryContactIdInput}
                onChange={(e) => setPrimaryContactIdInput(e.target.value)}
                placeholder="UUID of a contact you can access"
                className={cn(
                  "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm font-mono",
                  "text-kp-on-surface placeholder:text-kp-on-surface-variant",
                  "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                )}
              />
              {txn.primaryContact ? (
                <p className="text-[11px] text-kp-on-surface-variant">
                  Linked:{" "}
                  <Link href={`/contacts/${txn.primaryContact.id}`} className="text-kp-teal hover:underline">
                    {[txn.primaryContact.firstName, txn.primaryContact.lastName].filter(Boolean).join(" ")}
                  </Link>
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="detail-ext-src"
                className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant"
              >
                External source
              </label>
              <input
                id="detail-ext-src"
                type="text"
                value={externalSourceInput}
                onChange={(e) => setExternalSourceInput(e.target.value)}
                placeholder="e.g. csv, google_sheets"
                className={cn(
                  "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm",
                  "text-kp-on-surface placeholder:text-kp-on-surface-variant",
                  "focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="detail-ext-id"
                className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant"
              >
                External ID
              </label>
              <input
                id="detail-ext-id"
                type="text"
                value={externalSourceIdInput}
                onChange={(e) => setExternalSourceIdInput(e.target.value)}
                className={cn(
                  "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm",
                  "text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                )}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="detail-notes" className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
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

          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-kp-outline pt-4">
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
              Save changes
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-kp-outline/45 bg-kp-surface/50 p-3 shadow-none">
          <h2 className="text-xs font-semibold text-kp-on-surface">Commission splits</h2>
          <p className="mt-0.5 text-[11px] leading-snug text-kp-on-surface-variant">
            Allocation lines for this transaction. Totals here are separate from the workspace NCI estimate
            until you align splits with net.
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
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
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

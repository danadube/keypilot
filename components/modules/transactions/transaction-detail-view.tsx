"use client";

import useSWR from "swr";
import { apiFetcher } from "@/lib/fetcher";
import type { TransactionSide } from "@prisma/client";
import type { ComponentProps } from "react";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  Plus,
  X,
  Briefcase,
  ExternalLink,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getImportProvenance,
  getTransactionSetupGaps,
  setupGapLabel,
} from "./transactions-shared";
import { toast } from "sonner";
import { BrandSkeleton } from "@/components/ui/BrandSkeleton";
import {
  TransactionChecklistSection,
  TransactionContextRail,
  TransactionDetailIdentityRail,
  TransactionDetailLayout,
  TransactionDetailPageHeader,
  TransactionEditDialog,
  TransactionMilestonesCard,
  TransactionNextActionsCard,
  TransactionSignalsCard,
  TransactionTimelineShell,
  TransactionsModuleTabBarPanel,
} from "@/components/transactions";
import type { SerializedTask } from "@/lib/tasks/task-serialize";

type TaskListApiPayload = {
  overdue: SerializedTask[];
  dueToday: SerializedTask[];
  upcoming: SerializedTask[];
};

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

type TransactionDetail = {
  id: string;
  status: TxStatus;
  transactionSide?: TransactionSide | null;
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

function isoToDisplayDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isClosingSoon(closingDateIso: string | null, status: TxStatus): boolean {
  if (status === "CLOSED" || !closingDateIso) return false;
  const end = new Date(closingDateIso);
  if (Number.isNaN(end.getTime())) return false;
  const now = new Date();
  const ms = end.getTime() - now.getTime();
  const days = ms / 86400000;
  return days >= 0 && days <= 30;
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="min-h-full rounded-2xl bg-kp-bg pb-10">
      <TransactionsModuleTabBarPanel />
      <div className="px-6 pt-3 sm:px-8">
        <BrandSkeleton className="h-4 w-28" />
        <BrandSkeleton className="mt-4 h-8 w-64 max-w-full" />
        <BrandSkeleton className="mt-2 h-4 w-full max-w-md" />
      </div>
      <div className="mx-6 mt-6 grid gap-6 lg:grid-cols-[minmax(260px,320px)_1fr_minmax(260px,320px)] sm:mx-8">
        <BrandSkeleton className="h-72 w-full rounded-xl" />
        <div className="flex min-h-[320px] flex-col gap-4">
          <BrandSkeleton className="h-24 w-full rounded-xl" />
          <BrandSkeleton className="h-24 w-full rounded-xl" />
          <BrandSkeleton className="h-40 w-full rounded-xl" />
        </div>
        <BrandSkeleton className="h-64 w-full rounded-xl" />
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
  const dealCandidates = useMemo(() => linkedDeals ?? [], [linkedDeals]);

  const { data: tasksPayload, isLoading: tasksLoading } = useSWR<TaskListApiPayload>(
    txn?.property?.id
      ? `/api/v1/tasks?propertyId=${encodeURIComponent(txn.property.id)}`
      : null,
    apiFetcher
  );
  const propertyOpenTasks = useMemo(() => {
    if (!tasksPayload) return [];
    return [...tasksPayload.overdue, ...tasksPayload.dueToday, ...tasksPayload.upcoming];
  }, [tasksPayload]);

  const [editOpen, setEditOpen] = useState(false);

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
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  const scrollToTxnSection = useCallback((id: "txn-checklist" | "txn-timeline") => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const focusChecklistQuickAdd = useCallback(() => {
    scrollToTxnSection("txn-checklist");
    requestAnimationFrame(() => {
      document.getElementById("txn-checklist-quick-add")?.focus();
    });
  }, [scrollToTxnSection]);

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
  const setupGapLabels = useMemo(
    () => setupGaps.map((g) => setupGapLabel(g)),
    [setupGaps]
  );

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
    const detail =
      error?.includes("CRM features") || error?.includes("Full CRM")
        ? "Transactions require Full CRM access for your workspace."
        : error ??
          "This transaction could not be loaded. It may not exist or you may not have access.";
    return (
      <div className="min-h-full rounded-2xl bg-kp-bg pb-10">
        <TransactionsModuleTabBarPanel />
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 px-6 pt-6 text-center sm:px-8">
          <AlertCircle className="h-6 w-6 text-red-400" />
          <p className="max-w-md text-sm text-kp-on-surface-variant">{detail}</p>
          <Link
            href="/transactions"
            className="text-sm font-medium text-kp-teal underline-offset-2 hover:underline"
          >
            Back to overview
          </Link>
        </div>
      </div>
    );
  }

  const importSession = txn.committedImportSessions?.[0] ?? null;
  const importedAt = formatTimestamp(importSession?.createdAt);

  const txnTaskTitle = `Transaction: ${STATUS_LABELS[txn.status]} — ${txn.property.address1}`;
  const txnTaskDescription = [
    `Transaction ID: ${txn.id}`,
    `${txn.property.address1}, ${txn.property.city}, ${txn.property.state} ${txn.property.zip}`,
    txn.deal
      ? `Deal: ${DEAL_STATUS_LABELS[txn.deal.status]} — ${[txn.deal.contact.firstName, txn.deal.contact.lastName].filter(Boolean).join(" ") || "Contact"}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="min-h-full rounded-2xl bg-kp-bg pb-10">
      <TransactionsModuleTabBarPanel />
      <div className="px-6 pt-3 sm:px-8">
        <TransactionDetailPageHeader
          subtitle={
            <span>
              {txn.property.address1}
              <span className="text-kp-on-surface-variant">
                {" "}
                · {txn.property.city}, {txn.property.state} {txn.property.zip}
              </span>
            </span>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 gap-1.5 text-xs"
                onClick={() => setTaskModalOpen(true)}
              >
                <CheckSquare className="h-4 w-4" />
                Add task
              </Button>
            </div>
          }
        />
      </div>

      <div className="mx-6 mt-6 sm:mx-8">
        <TransactionDetailLayout
          left={
            <TransactionDetailIdentityRail
              property={txn.property}
              statusLabel={STATUS_LABELS[txn.status]}
              statusBadgeVariant={statusBadgeVariant(txn.status)}
              transactionSide={txn.transactionSide}
              closingDateLabel={isoToDisplayDate(txn.closingDate)}
              salePrice={txn.salePrice}
              brokerageName={txn.brokerageName}
              commissionLines={txn.commissions}
              archived={!!txn.deletedAt}
            />
          }
          center={
            <>
              <TransactionNextActionsCard
                onAddChecklistItem={focusChecklistQuickAdd}
                onLogActivity={() => scrollToTxnSection("txn-timeline")}
                onCreateTask={() => setTaskModalOpen(true)}
              />
              <TransactionChecklistSection
                transactionId={txn.id}
                onFocusQuickAdd={focusChecklistQuickAdd}
              />
              <TransactionTimelineShell
                onLogActivity={() => scrollToTxnSection("txn-timeline")}
              />
              <TransactionMilestonesCard
                closingDateIso={txn.closingDate}
                createdAtIso={txn.createdAt}
                updatedAtIso={txn.updatedAt}
              />

        <section className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Briefcase className="h-4 w-4 text-kp-on-surface-variant" />
            <h2 className="text-sm font-semibold text-kp-on-surface">Link or change CRM deal</h2>
          </div>
          <p className="mt-0.5 text-xs text-kp-on-surface-variant">
            Choose a deal on this same property. That deal&apos;s contact is what ties people to this
            closing (see Linked context on the right).
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-kp-on-surface">Transaction record</h2>
              <p className="mt-0.5 text-xs text-kp-on-surface-variant">
                Status, side, economics, and notes — use Edit in the header for a fast form.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit details
            </Button>
          </div>

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

          {txn.notes?.trim() ? (
            <p className="mt-4 line-clamp-4 text-sm text-kp-on-surface-variant">{txn.notes}</p>
          ) : (
            <p className="mt-4 text-sm text-kp-on-surface-variant">No notes yet.</p>
          )}
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
            </>
          }
          right={
            <>
              <TransactionSignalsCard
                setupGapLabels={setupGapLabels}
                archived={!!txn.deletedAt}
                importSourceFile={importProvenance?.sourceFile ?? null}
                closingSoon={isClosingSoon(txn.closingDate, txn.status)}
              />
              <TransactionContextRail
                property={txn.property}
                deal={txn.deal}
                tasksLoading={tasksLoading}
                openTasks={propertyOpenTasks}
              />
            </>
          }
        />
      </div>

      <TransactionEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        transaction={
          txn
            ? {
                id: txn.id,
                status: txn.status,
                transactionSide: txn.transactionSide,
                salePrice: txn.salePrice,
                closingDate: txn.closingDate,
                brokerageName: txn.brokerageName,
                notes: txn.notes,
                commissions: txn.commissions,
              }
            : null
        }
        onSaved={async () => {
          await reloadTxn();
        }}
      />

      <NewTaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        defaultPropertyId={txn.property.id}
        defaultContactId={txn.deal?.contact.id ?? null}
        initialTitle={txnTaskTitle}
        initialDescription={txnTaskDescription}
      />
    </div>
  );
}

function percentDisplay(v: string | number | null) {
  if (v === "" || v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return null;
  return n;
}

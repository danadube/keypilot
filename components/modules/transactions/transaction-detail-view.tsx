"use client";

import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { apiFetcher } from "@/lib/fetcher";
import { ArrowLeft, MapPin, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { entityDetailWorkspaceGridClassName } from "@/components/layout/entity-detail-workspace-grid";
import { TransactionDetailActivityPanel } from "@/components/modules/transactions/transaction-detail-activity-panel";
import { TransactionDetailActionsMenu } from "@/components/modules/transactions/transaction-detail-actions-menu";
import { TransactionDetailOperationsCue } from "@/components/modules/transactions/transaction-detail-operations-cue";
import { TransactionProgressWorkspace } from "@/components/modules/transactions/transaction-progress-workspace";
import { TransactionDetailTasksRail } from "@/components/modules/transactions/transaction-detail-tasks-rail";
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

type TransactionDetail = {
  id: string;
  status: TxStatus;
  side?: "BUY" | "SELL" | null;
  transactionKind: TxKind;
  primaryContactId: string | null;
  primaryContact: { id: string; firstName: string; lastName: string } | null;
  gci: number | null;
  nci: number | null;
  salePrice: string | number | null;
  closingDate: string | null;
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
  };
  commissions: { id: string }[];
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

const TERMINAL: TxStatus[] = ["CLOSED", "FALLEN_APART"];

// ── Main ──────────────────────────────────────────────────────────────────────

export function TransactionDetailView({ transactionId }: { transactionId: string }) {
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
          setTxn(json.data as TransactionDetail);
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [transactionId]);

  useEffect(() => {
    load();
  }, [load]);

  const { data: checklistRows, mutate: mutateChecklist } = useSWR<{ isComplete: boolean }[]>(
    transactionId ? `/api/v1/transactions/${transactionId}/checklist` : null,
    apiFetcher
  );

  const checklistOpenCount = useMemo(() => {
    if (!checklistRows || !Array.isArray(checklistRows)) return null;
    return checklistRows.filter((i) => !i.isComplete).length;
  }, [checklistRows]);

  const operationsCue = useMemo(() => {
    if (!txn) return null;
    const terminal = TERMINAL.includes(txn.status);
    const needsFinancialWorkspaceAttention =
      !terminal && txn.transactionKind === "SALE" && (txn.gci == null || txn.nci == null);
    const commissionSetupIncomplete =
      !terminal &&
      txn.transactionKind === "SALE" &&
      txn.nci != null &&
      txn.commissions.length === 0;

    return (
      <TransactionDetailOperationsCue
        closingDate={txn.closingDate}
        status={txn.status}
        hasPrimaryContact={!!txn.primaryContactId}
        needsFinancialWorkspaceAttention={needsFinancialWorkspaceAttention}
        checklistOpenCount={checklistOpenCount}
        commissionSetupIncomplete={commissionSetupIncomplete}
      />
    );
  }, [txn, checklistOpenCount]);

  const hqChrome = useTransactionHqChromeOptional();
  useEffect(() => {
    if (!hqChrome || !txn) return;
    hqChrome.setDetailActions(
      <TransactionDetailActionsMenu
        transactionId={transactionId}
        propertyId={txn.property.id}
        primaryContactId={txn.primaryContactId}
        currentStatus={txn.status}
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
    scrollToActivityNote,
    refreshTransactionActivity,
    load,
  ]);

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

  const financialHref = `/transactions/${transactionId}/financial`;

  return (
    <div className="min-h-full rounded-2xl bg-kp-bg pb-10">
      <div className="px-6 pt-3 sm:px-8">
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1.5 text-sm text-kp-on-surface-variant transition-colors hover:text-kp-teal"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Your deals
        </Link>
      </div>

      <div className={cn("px-6 pb-8 pt-4 sm:px-8", entityDetailWorkspaceGridClassName)}>
        {/* Identity — what deal, for whom, which property */}
        <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-none">
          <section className="rounded-xl border border-kp-outline/50 bg-kp-surface/50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
              Deal
            </p>
            <h1 className="font-headline mt-1 text-xl font-semibold leading-snug text-kp-on-surface">
              {txn.property.address1}
            </h1>
            <p className="mt-1 text-sm text-kp-on-surface-variant">
              {txn.property.city}, {txn.property.state} {txn.property.zip}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge variant={statusBadgeVariant(txn.status)}>
                {STATUS_LABELS[txn.status]}
              </StatusBadge>
              <span className="text-xs text-kp-on-surface-variant">
                {txn.transactionKind === "SALE" ? "Sale" : "Referral received"}
              </span>
              <span className="text-xs text-kp-on-surface-variant">
                Side:{" "}
                <span className="font-medium text-kp-on-surface">
                  {txn.side === "BUY" || txn.side === "SELL" ? txn.side : "—"}
                </span>
              </span>
            </div>

            <div className="mt-4 space-y-2 border-t border-kp-outline/40 pt-4 text-sm">
              {txn.closingDate ? (
                <p className="text-kp-on-surface">
                  <span className="text-kp-on-surface-variant">Closing: </span>
                  {new Date(txn.closingDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              ) : (
                <p className="text-kp-on-surface-variant">Closing date not set — edit in Financial &amp; records</p>
              )}

              <p className="text-kp-on-surface">
                <span className="text-kp-on-surface-variant">Client: </span>
                {txn.primaryContact ? (
                  <Link
                    href={`/contacts/${txn.primaryContact.id}`}
                    className="font-medium text-kp-teal hover:underline"
                  >
                    {[txn.primaryContact.firstName, txn.primaryContact.lastName].filter(Boolean).join(" ")}
                  </Link>
                ) : (
                  <span className="text-kp-on-surface-variant">Not linked — add in Financial &amp; records</span>
                )}
              </p>

              {txn.property?.id ? (
                <Link
                  href={`/properties/${txn.property.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-kp-teal hover:underline"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Linked property — open in PropertyVault
                </Link>
              ) : (
                <p className="text-xs text-kp-on-surface-variant">No property linked for this transaction.</p>
              )}
            </div>

            <div className="mt-4 border-t border-kp-outline/40 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                Economics (saved)
              </p>
              <dl className="mt-2 space-y-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-kp-on-surface-variant">Sale price</dt>
                  <dd className="tabular-nums text-kp-on-surface">{formatMoneyDisplay(txn.salePrice)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-kp-on-surface-variant">GCI</dt>
                  <dd className="tabular-nums text-kp-on-surface">{formatMoneyDisplay(txn.gci)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-kp-on-surface-variant">Net commission (NCI)</dt>
                  <dd className="tabular-nums font-medium text-kp-on-surface">{formatMoneyDisplay(txn.nci)}</dd>
                </div>
              </dl>
              <Link
                href={financialHref}
                className="mt-3 inline-flex text-xs font-medium text-kp-teal hover:underline"
              >
                Financial &amp; records — edit pricing, commissions, CRM link, and splits
              </Link>
            </div>
          </section>
        </div>

        {/* Primary work surface */}
        <div className="order-1 min-w-0 lg:order-none">
          <TransactionProgressWorkspace
            transactionId={transactionId}
            stageStatus={txn.status}
            side={txn.side === "BUY" || txn.side === "SELL" ? txn.side : null}
            archived={false}
            onListsChanged={() => {
              void refreshTransactionActivity();
              void mutateChecklist();
            }}
            className="border-kp-outline shadow-md"
          />
        </div>

        {/* Support rail */}
        <aside className="order-3 min-w-0 space-y-4 lg:order-none lg:border-l lg:border-kp-outline/25 lg:pl-3">
          {operationsCue}
          <TransactionDetailActivityPanel transactionId={transactionId} />
          <TransactionDetailTasksRail
            propertyId={txn.property.id}
            primaryContactId={txn.primaryContactId}
            onTaskCreated={() => void refreshTransactionActivity()}
          />
        </aside>
      </div>
    </div>
  );
}

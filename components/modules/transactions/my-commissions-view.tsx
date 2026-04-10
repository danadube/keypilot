"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import {
  type TxStatus,
  STATUS_LABELS,
  formatMoneyDetailed,
  formatDate,
  TH,
  TD,
} from "./transactions-shared";
import { UI_COPY } from "@/lib/ui-copy";
import { TransactionsModuleHeader } from "@/components/transactions";

type MineTransactionSummary = {
  id: string;
  status: TxStatus;
  salePrice: string | number | null;
  closingDate: string | null;
  brokerageName: string | null;
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
  };
} | null;

type MineCommissionRow = {
  id: string;
  transactionId: string;
  agentId: string | null;
  role: string;
  amount: string | number;
  percent: string | number | null;
  notes: string | null;
  createdAt: string;
  transaction: MineTransactionSummary;
};

function percentLabel(v: string | number | null) {
  if (v === null || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return "—";
  return `${n}%`;
}

function propertyLine(t: MineTransactionSummary) {
  if (!t?.property) return "—";
  const p = t.property;
  return `${p.address1}, ${p.city}, ${p.state} ${p.zip}`;
}

/**
 * Read-only list of commission lines where the current user is the named agent (agentId).
 * API: GET /api/v1/commissions/mine
 */
export function MyCommissionsView() {
  const [rows, setRows] = useState<MineCommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch("/api/v1/commissions/mine")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message ?? UI_COPY.errors.load("commissions"));
        else setRows(json.data ?? []);
      })
      .catch(() => setError(UI_COPY.errors.load("commissions")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-full rounded-2xl bg-kp-bg pb-10">
      <TransactionsModuleHeader
        subtitle="Commissions — Earnings on deals where you are assigned on a commission line. Open the parent transaction for full context."
      />

      <div className="mt-6 overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
        <div className="flex items-start gap-2 border-b border-kp-outline px-5 py-4">
          <Wallet className="mt-0.5 h-4 w-4 text-kp-teal" />
          <div>
            <p className="text-sm font-semibold text-kp-on-surface">Your assigned splits</p>
            <p className="text-xs text-kp-on-surface-variant">
              Read-only — edits happen on each transaction&apos;s detail page.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-kp-on-surface-variant" />
          </div>
        ) : error ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 px-4 py-10">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-sm text-kp-on-surface-variant">{error}</p>
            <button
              type="button"
              onClick={load}
              className="text-sm font-medium text-kp-teal underline-offset-2 hover:underline"
            >
              {UI_COPY.errors.retry}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <Wallet className="h-10 w-10 text-kp-on-surface-variant" />
            <p className="text-sm font-medium text-kp-on-surface">No commissions assigned to you yet</p>
            <p className="max-w-md text-sm text-kp-on-surface-variant">
              You&apos;ll see rows here when another agent adds a commission line on their transaction and sets you as the assigned agent.
            </p>
            <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "mt-2 text-xs")} asChild>
              <Link href="/transactions">View your transactions</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-kp-outline bg-kp-surface-high">
                  <th className={TH}>Property</th>
                  <th className={TH}>Role</th>
                  <th className={cn(TH, "tabular-nums")}>Amount</th>
                  <th className={cn(TH, "hidden sm:table-cell")}>%</th>
                  <th className={cn(TH, "hidden md:table-cell")}>Txn status</th>
                  <th className={cn(TH, "hidden lg:table-cell")}>Closing</th>
                  <th className={cn(TH, "w-32 text-right")} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const txn = r.transaction;
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-b border-kp-outline-variant transition-colors hover:bg-kp-surface-high",
                        i % 2 === 1 && "bg-kp-surface/40"
                      )}
                    >
                      <td className={TD}>
                        <p
                          className="max-w-[220px] font-medium text-kp-on-surface sm:max-w-xs"
                          title={propertyLine(txn)}
                        >
                          {txn?.property?.address1 ?? "—"}
                        </p>
                        {txn?.property && (
                          <p className="text-xs text-kp-on-surface-variant">
                            {txn.property.city}, {txn.property.state}
                          </p>
                        )}
                      </td>
                      <td className={TD}>
                        <span className="text-kp-on-surface">{r.role}</span>
                      </td>
                      <td className={cn(TD, "tabular-nums text-kp-on-surface")}>
                        {formatMoneyDetailed(r.amount)}
                      </td>
                      <td className={cn(TD, "hidden text-kp-on-surface-variant sm:table-cell")}>
                        {percentLabel(r.percent)}
                      </td>
                      <td className={cn(TD, "hidden text-kp-on-surface-variant md:table-cell")}>
                        {txn ? STATUS_LABELS[txn.status] : "—"}
                      </td>
                      <td className={cn(TD, "hidden text-kp-on-surface-variant lg:table-cell")}>
                        {txn ? formatDate(txn.closingDate) : "—"}
                      </td>
                      <td className={cn(TD, "text-right")}>
                        {txn?.id ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(kpBtnSecondary, "h-8 border px-2.5 text-xs")}
                            asChild
                          >
                            <Link
                              href={`/transactions/${txn.id}`}
                              className="inline-flex items-center gap-1"
                            >
                              Transaction
                              <ExternalLink className="h-3 w-3 opacity-70" />
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-xs text-kp-on-surface-variant">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GitBranch, AlertCircle, Loader2, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import {
  type TransactionRow,
  type TxStatus,
  PipelineTableRow,
  TH,
} from "./transactions-shared";
import { UI_COPY } from "@/lib/ui-copy";

const TERMINAL: TxStatus[] = ["CLOSED", "FALLEN_APART"];

const PIPELINE_STAGES: { status: TxStatus; title: string; blurb: string }[] = [
  { status: "LEAD", title: "Lead", blurb: "Early stage" },
  { status: "PENDING", title: "Pending", blurb: "In progress" },
  { status: "UNDER_CONTRACT", title: "Under contract", blurb: "Contract in place" },
  { status: "IN_ESCROW", title: "In escrow", blurb: "Escrow period" },
];

function sortPipelineRows(a: TransactionRow, b: TransactionRow) {
  const ca = a.closingDate ? new Date(a.closingDate).getTime() : Infinity;
  const cb = b.closingDate ? new Date(b.closingDate).getTime() : Infinity;
  if (ca !== cb) return ca - cb;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

/**
 * Pipeline — active transactions only (excludes closed / fallen apart),
 * grouped into four stage sections. Same API as overview: GET /api/v1/transactions.
 */
export function TransactionsPipelineView() {
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch("/api/v1/transactions")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message ?? UI_COPY.errors.load("pipeline"));
        else setRows(json.data ?? []);
      })
      .catch(() => setError(UI_COPY.errors.load("pipeline")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeRows = useMemo(
    () => rows.filter((t) => !TERMINAL.includes(t.status)),
    [rows]
  );

  const grouped = useMemo(() => {
    const map = new Map<TxStatus, TransactionRow[]>();
    for (const s of PIPELINE_STAGES) map.set(s.status, []);
    for (const t of activeRows) {
      const bucket = map.get(t.status);
      if (bucket) bucket.push(t);
    }
    PIPELINE_STAGES.forEach(({ status }) => {
      const list = map.get(status);
      if (list) list.sort(sortPipelineRows);
    });
    return map;
  }, [activeRows]);

  const totalActive = activeRows.length;

  return (
    <div className="min-h-full rounded-2xl bg-kp-bg pb-10">
      <div className="flex flex-col gap-3 px-6 pb-4 pt-3 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div>
          <h1 className="font-headline text-[1.75rem] font-semibold leading-tight tracking-tight text-kp-on-surface">
            Closing pipeline
          </h1>
          <p className="mt-0.5 text-sm text-kp-on-surface-variant">
            Active closings grouped by stage. Closed deals stay on the overview list.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-9 text-xs")} asChild>
            <Link href="/transactions">
              <List className="h-3.5 w-3.5" />
              All transactions
            </Link>
          </Button>
        </div>
      </div>

      <div className="mx-6 space-y-6 sm:mx-8">
        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-kp-outline bg-kp-surface">
            <Loader2 className="h-6 w-6 animate-spin text-kp-on-surface-variant" />
          </div>
        ) : error ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-kp-outline bg-kp-surface px-4">
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
        ) : totalActive === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-kp-outline bg-kp-surface px-6 py-14 text-center">
            <GitBranch className="h-10 w-10 text-kp-on-surface-variant" />
            <p className="text-sm font-medium text-kp-on-surface">No active pipeline items</p>
            <p className="max-w-md text-kp-on-surface-variant">
              When none of your transactions are closed or fallen apart, they appear here by stage.
              Add or update transactions from the overview.
            </p>
            <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "mt-2 text-xs")} asChild>
              <Link href="/transactions">Go to transactions</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {PIPELINE_STAGES.map(({ status, title, blurb }) => {
              const sectionRows = grouped.get(status) ?? [];
              return (
                <section
                  key={status}
                  className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface"
                >
                  <div className="border-b border-kp-outline bg-kp-surface-high px-4 py-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="text-sm font-semibold text-kp-on-surface">{title}</h2>
                      <span className="text-xs tabular-nums text-kp-on-surface-variant">
                        {sectionRows.length}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-kp-on-surface-variant">{blurb}</p>
                  </div>
                  {sectionRows.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-kp-on-surface-variant">
                      Nothing in this stage.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-kp-outline-variant bg-kp-surface">
                            <th className={TH}>Property</th>
                            <th className={TH}>Side</th>
                            <th className={TH}>Sale price</th>
                            <th className={TH}>Closing</th>
                            <th className={cn(TH, "w-28 text-right")} />
                          </tr>
                        </thead>
                        <tbody>
                          {sectionRows.map((t, i) => (
                            <PipelineTableRow key={t.id} row={t} index={i} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

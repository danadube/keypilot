"use client";

import useSWR from "swr";
import Link from "next/link";
import { AlertCircle, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  kpBtnTertiary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { Button } from "@/components/ui/button";
import type { TransactionAttentionItem } from "@/lib/transactions/transaction-attention-types";

type AttentionResponse = {
  data: TransactionAttentionItem[];
  unavailable: boolean;
};

async function transactionAttentionFetcher(url: string): Promise<AttentionResponse> {
  const res = await fetch(url);
  if (res.status === 403) {
    return { data: [], unavailable: true };
  }
  const json = (await res.json().catch(() => ({}))) as {
    data?: TransactionAttentionItem[];
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(json.error?.message ?? "Failed to load transaction attention");
  }
  return { data: json.data ?? [], unavailable: false };
}

export function TransactionAttentionSection({
  loading,
  className,
}: {
  /** When true, outer dashboard is still loading core stats — show subtle skeleton. */
  loading: boolean;
  className?: string;
}) {
  const { data, error, isLoading, mutate } = useSWR<AttentionResponse>(
    "/api/v1/transactions/attention",
    transactionAttentionFetcher,
    { errorRetryCount: 2, errorRetryInterval: 500 }
  );

  const items = data?.data ?? [];
  const unavailable = data?.unavailable ?? false;
  const busy = loading || isLoading;

  return (
    <section aria-labelledby="dash-txn-attention" className={cn("scroll-mt-2", className)}>
      <h2
        id="dash-txn-attention"
        className="mb-2 font-headline text-lg font-semibold tracking-tight text-kp-on-surface"
      >
        Transaction attention
      </h2>
      <p className="mb-2 max-w-xl text-[13px] leading-snug text-kp-on-surface-muted">
        Closings that need setup, a date coming up, or checklist follow-up — jump straight into the
        record.
      </p>

      <div className="rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm">
        {busy ? (
          <ul className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((k) => (
              <li
                key={k}
                className="h-12 animate-pulse rounded-lg bg-kp-surface-high/40"
                aria-hidden
              />
            ))}
          </ul>
        ) : error ? (
          <div className="flex flex-col items-start gap-2 py-2">
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error instanceof Error ? error.message : "Could not load transactions"}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(kpBtnTertiary, "h-8 shrink-0 px-2.5 text-xs")}
              onClick={() => void mutate()}
            >
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className="py-2 text-sm leading-snug text-kp-on-surface-muted">
            {unavailable
              ? "Transaction attention is available with Full CRM access."
              : "No transaction attention items right now — you’re clear on closings."}
          </p>
        ) : (
          <ul className="space-y-1.5" aria-label="Transactions needing attention">
            {items.map((item, index) => (
              <li
                key={item.transactionId}
                className={cn(
                  "rounded-lg border px-2.5 py-2.5 sm:px-3",
                  index === 0
                    ? "border-kp-gold/35 bg-kp-gold/[0.06]"
                    : "border-kp-outline/80 bg-kp-surface-high/15"
                )}
              >
                <Link
                  href={item.href}
                  className="group flex items-start gap-2.5"
                  prefetch={false}
                >
                  <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal/90" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-kp-on-surface group-hover:text-kp-teal group-hover:underline">
                      {item.primaryLine}
                    </p>
                    <p className="mt-0.5 text-[11px] text-kp-on-surface-muted">
                      {item.city}, {item.state} · Open transaction
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

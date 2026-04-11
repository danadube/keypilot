"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, History, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type FarmImportHistoryRow = {
  id: string;
  createdAt: string;
  completedAt: string | null;
  sourceType: "CSV" | "XLSX";
  fileName: string | null;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  status: "COMPLETED" | "FAILED";
  errorSummary: string | null;
};

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function FarmTrackrRecentImports({ refreshKey }: { refreshKey?: number }) {
  const [rows, setRows] = useState<FarmImportHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/v1/farm-imports/history?limit=15")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error?.message ?? "Could not load import history");
        }
        setRows((json.data ?? []) as FarmImportHistoryRow[]);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load import history")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <div className="rounded-lg border border-kp-outline/80 bg-kp-surface-high/40 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-kp-on-surface">
        <History className="h-3.5 w-3.5 text-kp-teal/90" aria-hidden />
        Recent imports
      </div>
      <p className="mt-1 text-[11px] leading-snug text-kp-on-surface-variant">
        Review past CSV and Excel apply runs for this workspace.
      </p>

      {loading ? (
        <p className="mt-3 flex items-center gap-2 text-[11px] text-kp-on-surface-variant">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          Loading…
        </p>
      ) : error ? (
        <p className="mt-3 flex items-center gap-2 text-[11px] text-amber-200/90">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-[11px] text-kp-on-surface-variant">
          No import runs yet. Each apply attempt is listed here after you import.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-md border border-kp-outline/70 bg-kp-surface px-2.5 py-2 text-[11px]"
            >
              <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                <div className="min-w-0">
                  <p className="font-medium text-kp-on-surface">
                    {r.fileName?.trim() ? (
                      <span className="truncate" title={r.fileName}>
                        {r.fileName}
                      </span>
                    ) : (
                      <span className="text-kp-on-surface-variant">Unnamed file</span>
                    )}
                  </p>
                  <p className="mt-0.5 tabular-nums text-kp-on-surface-variant">
                    {formatWhen(r.createdAt)} · {r.sourceType}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    r.status === "COMPLETED"
                      ? "border border-emerald-400/35 bg-emerald-500/15 text-emerald-100"
                      : "border border-rose-400/35 bg-rose-500/15 text-rose-100"
                  )}
                >
                  {r.status === "COMPLETED" ? (
                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                  ) : (
                    <AlertCircle className="h-3 w-3" aria-hidden />
                  )}
                  {r.status === "COMPLETED" ? "Completed" : "Failed"}
                </span>
              </div>
              <p className="mt-1.5 tabular-nums text-kp-on-surface-variant">
                {r.totalRows} rows · {r.createdCount} created · {r.updatedCount} updated ·{" "}
                {r.skippedCount} skipped
                {r.failedCount > 0 ? <> · {r.failedCount} failed</> : null}
              </p>
              {r.status === "FAILED" && r.errorSummary ? (
                <p className="mt-1 border-t border-kp-outline/60 pt-1.5 text-[10px] leading-snug text-rose-200/90">
                  {r.errorSummary}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

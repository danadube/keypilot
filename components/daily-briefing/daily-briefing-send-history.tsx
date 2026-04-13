"use client";

import { useCallback, useEffect, useState } from "react";

type SendLogRow = {
  id: string;
  targetEmail: string;
  localDateKey: string;
  status: "SENT" | "SKIPPED" | "FAILED";
  detail: string | null;
  resendMessageId: string | null;
  source: "cron" | "test";
  createdAt: string;
};

function statusClass(status: SendLogRow["status"]): string {
  if (status === "SENT") {
    return "text-emerald-800 bg-emerald-50";
  }
  if (status === "SKIPPED") {
    return "text-amber-900 bg-amber-50";
  }
  return "text-red-900 bg-red-50";
}

export function DailyBriefingSendHistory() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<SendLogRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/daily-briefing/send-history?limit=40");
      const json = (await res.json().catch(() => ({}))) as {
        data?: { items?: SendLogRow[] };
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(json.error?.message || "Could not load send history");
      }
      setItems(json.data?.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load send history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-kp-on-surface">Recent send attempts</h3>
          <p className="mt-0.5 text-xs text-kp-on-surface-variant">
            Logged when a due send runs (cron) or you send a test. High-frequency &quot;not yet due&quot; ticks are not
            stored.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-kp-outline px-2 py-1 text-xs font-medium text-kp-on-surface hover:bg-kp-surface-variant/30"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      {loading && items.length === 0 ? (
        <p className="text-sm text-kp-on-surface-variant">Loading…</p>
      ) : null}

      {!loading && items.length === 0 ? (
        <p className="text-sm text-kp-on-surface-variant">No send attempts recorded yet.</p>
      ) : null}

      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-kp-outline text-kp-on-surface-variant">
                <th className="py-2 pr-3 font-medium">Time (UTC)</th>
                <th className="py-2 pr-3 font-medium">Local day</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">To</th>
                <th className="py-2 pr-3 font-medium">Source</th>
                <th className="py-2 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-kp-outline/60">
                  <td className="py-2 pr-3 font-mono text-kp-on-surface">
                    {new Date(row.createdAt).toISOString().replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="py-2 pr-3 font-mono text-kp-on-surface">{row.localDateKey}</td>
                  <td className="py-2 pr-3">
                    <span className={`rounded px-1.5 py-0.5 font-medium ${statusClass(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="max-w-[180px] truncate py-2 pr-3 text-kp-on-surface" title={row.targetEmail}>
                    {row.targetEmail}
                  </td>
                  <td className="py-2 pr-3 uppercase text-kp-on-surface-variant">{row.source}</td>
                  <td className="py-2 text-kp-on-surface">
                    {row.detail ? (
                      <span className="break-words">{row.detail}</span>
                    ) : row.resendMessageId ? (
                      <span className="font-mono text-[11px] text-kp-on-surface-variant">{row.resendMessageId}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

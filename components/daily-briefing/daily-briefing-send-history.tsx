"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

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

function statusLabel(status: SendLogRow["status"]): string {
  if (status === "SENT") {
    return "Sent";
  }
  if (status === "SKIPPED") {
    return "Skipped";
  }
  return "Failed";
}

function sourceLabel(source: SendLogRow["source"]): string {
  return source === "cron" ? "Scheduled" : "Test";
}

function formatSkipOrFailureDetail(detail: string): string {
  const map: Record<string, string> = {
    email_disabled: "Email delivery is turned off in settings.",
    cron_sends_disabled: "Scheduled sending is paused (server configuration).",
    invalid_delivery_email: "Delivery address is missing or invalid.",
    rollout_not_eligible: "Not in the current rollout for automated sends.",
  };
  if (map[detail]) {
    return map[detail];
  }
  if (detail.startsWith("send_env_unavailable:")) {
    const rest = detail.slice("send_env_unavailable:".length).trim();
    return rest ? `Email provider unavailable (${rest})` : "Email provider unavailable.";
  }
  return detail;
}

function detailCell(row: SendLogRow): ReactNode {
  if (row.status === "SENT") {
    if (row.resendMessageId) {
      return (
        <span className="text-kp-on-surface">
          <span className="font-medium">Delivered</span>
          <span className="mt-0.5 block font-mono text-[11px] text-kp-on-surface-variant" title={row.resendMessageId}>
            ID {row.resendMessageId.length > 24 ? `${row.resendMessageId.slice(0, 24)}…` : row.resendMessageId}
          </span>
        </span>
      );
    }
    return <span className="text-kp-on-surface-variant">Sent (no provider id stored)</span>;
  }
  if (row.detail) {
    return <span className="break-words text-kp-on-surface">{formatSkipOrFailureDetail(row.detail)}</span>;
  }
  return <span className="text-kp-on-surface-variant">—</span>;
}

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
            Logged when the scheduler attempts delivery or you send a test. Routine &quot;not yet due&quot; checks are
            not listed here.
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
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-kp-outline text-kp-on-surface-variant">
                <th className="py-2 pr-3 font-medium">When (UTC)</th>
                <th className="py-2 pr-3 font-medium">This device</th>
                <th className="py-2 pr-3 font-medium">Briefing day</th>
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
                  <td className="py-2 pr-3 text-kp-on-surface">
                    {new Date(row.createdAt).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="py-2 pr-3 font-mono text-kp-on-surface">{row.localDateKey}</td>
                  <td className="py-2 pr-3">
                    <span className={`rounded px-1.5 py-0.5 font-medium ${statusClass(row.status)}`}>
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td className="max-w-[180px] truncate py-2 pr-3 text-kp-on-surface" title={row.targetEmail}>
                    {row.targetEmail}
                  </td>
                  <td className="py-2 pr-3 text-kp-on-surface-variant">{sourceLabel(row.source)}</td>
                  <td className="py-2 text-kp-on-surface">{detailCell(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type DeliveryPayload = {
  emailEnabled: boolean;
  sendLocalMinuteOfDay: number;
  timeZone: string;
  deliveryEmailOverride: string | null;
  lastSentLocalDate: string | null;
  accountEmail: string;
  isProvisioned: boolean;
  testSendAllowed?: boolean;
};

function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeToMinutes(v: string): number {
  const [hs, ms] = v.split(":");
  const h = Number(hs);
  const m = Number(ms);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return 480;
  }
  return Math.min(1439, Math.max(0, h * 60 + m));
}

export function DailyBriefingDeliverySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [data, setData] = useState<DeliveryPayload | null>(null);
  const [timeValue, setTimeValue] = useState("08:00");
  const [testSending, setTestSending] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/daily-briefing/delivery");
      const json = (await res.json().catch(() => ({}))) as { data?: DeliveryPayload; error?: { message?: string } };
      if (!res.ok) {
        throw new Error(json.error?.message || "Could not load settings");
      }
      if (!json.data) {
        throw new Error("Invalid response");
      }
      setData(json.data);
      setTimeValue(minutesToTime(json.data.sendLocalMinuteOfDay));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(partial: Partial<DeliveryPayload> & { sendLocalMinuteOfDay?: number }) {
    if (!data) {
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/v1/daily-briefing/delivery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      const json = (await res.json().catch(() => ({}))) as { data?: DeliveryPayload; error?: { message?: string } };
      if (!res.ok) {
        throw new Error(json.error?.message || "Save failed");
      }
      if (json.data) {
        setData(json.data);
        setTimeValue(minutesToTime(json.data.sendLocalMinuteOfDay));
      }
      setSaved(true);
      setTestMessage(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !data) {
    return (
      <p className="text-sm text-kp-on-surface-variant">{loading ? "Loading…" : "Nothing to show."}</p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-kp-on-surface">Email delivery</h2>
        <p className="mt-1 text-sm text-kp-on-surface-variant">
          Scheduled sends use the same content as the preview. Delivery is off by default and may be limited during rollout.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}
      {saved ? (
        <p className="text-sm text-kp-teal" role="status">
          Saved.
        </p>
      ) : null}

      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5 space-y-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-kp-outline"
            checked={data.emailEnabled}
            disabled={saving}
            onChange={(e) => void save({ emailEnabled: e.target.checked })}
          />
          <span>
            <span className="text-sm font-medium text-kp-on-surface">Send daily briefing by email</span>
            <span className="mt-0.5 block text-xs text-kp-on-surface-variant">
              When enabled, you may receive one message per local day after your chosen send time (subject to team rollout
              settings).
            </span>
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="db-send-time" className="mb-1 block text-xs font-medium text-kp-on-surface-variant">
              Local send time
            </label>
            <input
              id="db-send-time"
              type="time"
              className="w-full rounded-lg border border-kp-outline bg-white px-3 py-2 text-sm text-kp-on-surface"
              value={timeValue}
              disabled={saving}
              onChange={(e) => {
                setTimeValue(e.target.value);
              }}
              onBlur={() => void save({ sendLocalMinuteOfDay: timeToMinutes(timeValue) })}
            />
          </div>
          <div>
            <label htmlFor="db-tz" className="mb-1 block text-xs font-medium text-kp-on-surface-variant">
              Time zone (IANA)
            </label>
            <input
              id="db-tz"
              type="text"
              className="w-full rounded-lg border border-kp-outline bg-white px-3 py-2 text-sm text-kp-on-surface"
              value={data.timeZone}
              disabled={saving}
              onChange={(e) => setData({ ...data, timeZone: e.target.value })}
              onBlur={() => void save({ timeZone: data.timeZone.trim() || "America/Los_Angeles" })}
              placeholder="America/Los_Angeles"
            />
          </div>
        </div>

        <div>
          <label htmlFor="db-override" className="mb-1 block text-xs font-medium text-kp-on-surface-variant">
            Delivery email (optional)
          </label>
          <input
            id="db-override"
            type="email"
            className="w-full rounded-lg border border-kp-outline bg-white px-3 py-2 text-sm text-kp-on-surface"
            value={data.deliveryEmailOverride ?? ""}
            disabled={saving}
            placeholder={data.accountEmail}
            onChange={(e) => setData({ ...data, deliveryEmailOverride: e.target.value || null })}
            onBlur={() =>
              void save({
                deliveryEmailOverride: data.deliveryEmailOverride?.trim() || "",
              })
            }
          />
          <p className="mt-1 text-xs text-kp-on-surface-variant">
            Defaults to your account email ({data.accountEmail}).
          </p>
        </div>

        {data.lastSentLocalDate ? (
          <p className="text-xs text-kp-on-surface-variant">
            Last sent for local day: <span className="font-mono">{data.lastSentLocalDate}</span>
          </p>
        ) : (
          <p className="text-xs text-kp-on-surface-variant">No recorded send yet for your timezone.</p>
        )}

        {data.testSendAllowed ? (
          <div className="border-t border-kp-outline pt-4">
            <button
              type="button"
              className="rounded-lg border border-kp-outline bg-kp-surface px-3 py-2 text-sm font-medium text-kp-on-surface hover:bg-kp-surface-variant/30 disabled:opacity-50"
              disabled={saving || testSending || !data.isProvisioned}
              onClick={async () => {
                setTestSending(true);
                setTestMessage(null);
                try {
                  const res = await fetch("/api/v1/daily-briefing/send-test", { method: "POST" });
                  const json = (await res.json().catch(() => ({}))) as {
                    data?: { to?: string };
                    error?: { message?: string; code?: string };
                  };
                  if (!res.ok) {
                    throw new Error(json.error?.message || "Test send failed");
                  }
                  setTestMessage(`Test email sent to ${json.data?.to ?? "your address"}.`);
                } catch (e) {
                  setTestMessage(e instanceof Error ? e.message : "Test send failed");
                } finally {
                  setTestSending(false);
                }
              }}
            >
              {testSending ? "Sending test…" : "Send test email now"}
            </button>
            <p className="mt-2 text-xs text-kp-on-surface-variant">
              Uses the same renderer as scheduled delivery; does not change the “last sent” date. Requires server flag{" "}
              <span className="font-mono">DAILY_BRIEFING_TEST_SEND_ENABLED</span>.
            </p>
            {testMessage ? <p className="mt-2 text-sm text-kp-on-surface">{testMessage}</p> : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        <h3 className="text-sm font-semibold text-kp-on-surface">Preview</h3>
        <p className="mt-1 text-xs text-kp-on-surface-variant">
          Open the HTML and plain-text preview — no email is sent from the preview.
        </p>
        <Link
          href="/settings/daily-briefing/preview"
          className="mt-3 inline-block text-sm font-medium text-kp-teal hover:underline"
        >
          Daily briefing preview →
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { BrandButton } from "@/components/ui/BrandButton";

type CalendarRow = {
  id: string;
  summary: string;
  primary: boolean;
  selected: boolean;
};

export function GoogleCalendarSyncPanel({ connectionId }: { connectionId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<CalendarRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    fetch(`/api/v1/settings/connections/${connectionId}/google-calendars`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json?.error?.message ?? "Failed to load calendars");
        return json;
      })
      .then((json) => {
        if (json.error) throw new Error(json.error.message ?? "Failed to load calendars");
        const data = json.data;
        if (!data?.calendars) throw new Error("Invalid response");
        setRows(data.calendars);
        setSelected(new Set<string>(data.selectedIds ?? []));
      })
      .catch((e) => {
        setLoadError((e as Error).message);
        setRows([]);
        setSelected(new Set());
      })
      .finally(() => setLoading(false));
  }, [connectionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) {
          toast.error("At least one calendar must stay selected.");
          return prev;
        }
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const save = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one calendar.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`/api/v1/settings/connections/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleCalendarSelectedIds: Array.from(selected) }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error?.message ?? "Failed to save");
      toast.success("Calendar sync updated");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && rows.length === 0 && !loadError) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-md border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] px-3 py-2 text-xs text-[var(--brand-text-muted)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        Loading Google calendars…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mt-3 rounded-md border border-[var(--brand-danger)]/40 bg-[var(--brand-danger)]/10 px-3 py-2 text-xs text-[var(--brand-danger)]">
        <p>{loadError}</p>
        <BrandButton variant="secondary" size="sm" className="mt-2" type="button" onClick={() => load()}>
          Retry
        </BrandButton>
        <p className="mt-2 text-[var(--brand-text-muted)]">
          Reconnect Google Calendar under Connections if access was revoked. New connections include calendar list
          permission.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-[var(--brand-border)] bg-[var(--brand-bg)]/40 px-3 py-2.5">
      <p className="text-xs font-semibold text-[var(--brand-text)]">Calendars in KeyPilot</p>
      <p className="mt-0.5 text-[11px] leading-snug text-[var(--brand-text-muted)]">
        Choose which Google calendars appear on Calendar (read-only). Primary is on by default.
      </p>
      <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1">
        {rows.map((row) => (
          <li key={row.id}>
            <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 text-xs hover:bg-[var(--brand-surface-alt)]">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={selected.has(row.id)}
                onChange={() => toggle(row.id)}
              />
              <span className="min-w-0 flex-1">
                <span className="font-medium text-[var(--brand-text)]">{row.summary}</span>
                {row.primary ? (
                  <span className="ml-1.5 text-[10px] uppercase tracking-wide text-[var(--brand-text-muted)]">
                    Primary
                  </span>
                ) : null}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-end">
        <BrandButton variant="accent" size="sm" type="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save selection"}
        </BrandButton>
      </div>
    </div>
  );
}

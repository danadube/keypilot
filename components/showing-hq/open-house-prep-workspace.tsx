"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { InviteHostDialog } from "@/components/open-houses/InviteHostDialog";
import { buildOpenHousePrepChecklist } from "@/lib/showing-hq/prep-checklist";
import { mergePrepChecklistFlags } from "@/lib/showing-hq/prep-checklist-flags";

export type OpenHousePrepWorkspaceInput = {
  flyerUrl?: string | null;
  flyerOverrideUrl?: string | null;
  propertyFlyerUrl?: string | null;
  qrSlug?: string | null;
  notes?: string | null;
  hostNotes?: string | null;
  hostAgentId?: string | null;
  nonListingHostCount?: number;
  prepChecklistFlags?: Record<string, unknown> | null;
};

function ToggleSwitch({
  checked,
  onCheckedChange,
  disabled,
  label,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors",
        checked ? "border-kp-teal/50 bg-kp-teal/25" : "border-kp-outline bg-kp-surface-high",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-kp-on-surface shadow transition-transform",
          checked ? "left-6 bg-kp-teal" : "left-0.5"
        )}
      />
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function OpenHousePrepWorkspace({
  openHouseId,
  input,
  onReload,
  onJumpToDetailsForQr,
}: {
  openHouseId: string;
  input: OpenHousePrepWorkspaceInput;
  onReload: () => void;
  onJumpToDetailsForQr?: () => void;
}) {
  const [flagBusy, setFlagBusy] = useState(false);
  const [notes, setNotes] = useState(input.notes ?? "");
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNotes(input.notes ?? "");
  }, [input.notes, openHouseId]);

  const prepItems = useMemo(
    () =>
      buildOpenHousePrepChecklist({
        ...input,
        notes,
        prepChecklistFlags: input.prepChecklistFlags ?? null,
      }),
    [input, notes]
  );

  const doneCount = prepItems.filter((i) => i.complete).length;
  const total = prepItems.length;
  const allComplete = doneCount === total;

  const persistPrepFlags = useCallback(
    async (patch: Record<string, boolean>) => {
      setFlagBusy(true);
      try {
        const merged = mergePrepChecklistFlags(input.prepChecklistFlags, patch);
        const res = await fetch(`/api/v1/open-houses/${openHouseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prepChecklistFlags: merged }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
        onReload();
      } finally {
        setFlagBusy(false);
      }
    },
    [openHouseId, input.prepChecklistFlags, onReload]
  );

  const flushNotes = useCallback(async () => {
    setAutoSaveState("saving");
    try {
      const res = await fetch(`/api/v1/open-houses/${openHouseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() ? notes : null }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      onReload();
      setAutoSaveState("saved");
      window.setTimeout(() => setAutoSaveState("idle"), 1600);
    } catch {
      setAutoSaveState("idle");
    }
  }, [openHouseId, notes, onReload]);

  const scheduleNotes = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void flushNotes();
    }, 650);
  }, [flushNotes]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const getItem = (id: string) => prepItems.find((i) => i.id === id);

  function rowToggle(flagKey: string, itemId: string) {
    const item = getItem(itemId);
    if (!item) return;
    const next = !item.complete;
    void persistPrepFlags({ [flagKey]: next });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-kp-teal/25 bg-kp-teal/[0.06] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-kp-on-surface">Prep progress</p>
            <p className="text-xs text-kp-on-surface-variant">
              {doneCount} of {total} complete
            </p>
          </div>
          {autoSaveState === "saving" ? (
            <span className="text-[11px] text-kp-on-surface-variant">Saving notes…</span>
          ) : autoSaveState === "saved" ? (
            <span className="text-[11px] font-medium text-emerald-400">Saved</span>
          ) : null}
        </div>
        {!allComplete ? (
          <p className="mt-2 text-xs text-amber-200/90">Complete remaining items to move forward.</p>
        ) : (
          <p className="mt-2 text-xs text-emerald-400/90">Prep is in good shape for this open house.</p>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-kp-outline/90 bg-kp-surface-high/20 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-teal/90">
          Complete this to move forward
        </p>

        {(["flyer", "sign_in", "host", "signs"] as const).map((key) => {
          const item = getItem(key);
          if (!item) return null;
          const editFlyer = key === "flyer";
          const editQr = key === "sign_in";
          const editHost = key === "host";
          return (
            <div
              key={key}
              className="flex flex-col gap-2 rounded-lg border border-kp-outline/60 bg-kp-surface/40 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-kp-on-surface">{item.label}</p>
                <p className="mt-0.5 text-[11px] text-kp-on-surface-variant">
                  {item.complete ? "Marked ready — adjust if something changed." : "Mark when this piece is truly ready."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {editFlyer ? (
                  <Button variant="outline" size="sm" className={cn(kpBtnTertiary, "h-7 text-[11px]")} asChild>
                    <Link href={`/open-houses/${openHouseId}`}>Manage flyer</Link>
                  </Button>
                ) : null}
                {editQr ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(kpBtnTertiary, "h-7 text-[11px]")}
                    onClick={() => onJumpToDetailsForQr?.()}
                  >
                    QR tools
                  </Button>
                ) : null}
                {editHost ? (
                  <InviteHostDialog openHouseId={openHouseId} onInviteSent={onReload} />
                ) : null}
                <ToggleSwitch
                  label={item.label}
                  checked={item.complete}
                  disabled={flagBusy}
                  onCheckedChange={() => rowToggle(item.flagKey, item.id)}
                />
              </div>
            </div>
          );
        })}

        <div className="rounded-lg border border-kp-outline/60 bg-kp-surface/40 p-3">
          <p className="text-xs font-medium text-kp-on-surface">Notes / instructions</p>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              scheduleNotes();
            }}
            onBlur={() => void flushNotes()}
            placeholder="Host instructions, parking, special notes…"
            className="mt-2 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm text-kp-on-surface placeholder:text-kp-on-surface-variant/70"
          />
          <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "mt-2 h-7 text-[11px]")} asChild>
            <Link href={`/open-houses/${openHouseId}`}>Full editor</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

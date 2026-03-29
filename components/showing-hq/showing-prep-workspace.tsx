"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { buildShowingPrepChecklist } from "@/lib/showing-hq/prep-checklist";
import { mergePrepChecklistFlags } from "@/lib/showing-hq/prep-checklist-flags";

export type ShowingPrepWorkspaceSource = {
  id: string;
  feedbackRequired: boolean;
  feedbackDraftGeneratedAt?: string | null;
  prepChecklistFlags?: Record<string, unknown> | null;
  buyerAgentName: string | null;
  buyerAgentEmail: string | null;
  notes: string | null;
};

function ToggleSwitch({
  checked,
  onCheckedChange,
  disabled,
  id,
  label,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  id: string;
  label: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors",
        checked
          ? "border-kp-teal/50 bg-kp-teal/25"
          : "border-kp-outline bg-kp-surface-high",
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

export function ShowingPrepWorkspace<
  T extends ShowingPrepWorkspaceSource = ShowingPrepWorkspaceSource,
>({
  source,
  onUpdated,
}: {
  source: ShowingPrepWorkspaceSource;
  onUpdated: (json: { data: T }) => void;
}) {
  const [flagBusy, setFlagBusy] = useState(false);
  const [name, setName] = useState(source.buyerAgentName?.trim() ?? "");
  const [email, setEmail] = useState(source.buyerAgentEmail?.trim() ?? "");
  const [notes, setNotes] = useState(source.notes ?? "");
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [editName, setEditName] = useState(false);
  const [editEmail, setEditEmail] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setName(source.buyerAgentName?.trim() ?? "");
    setEmail(source.buyerAgentEmail?.trim() ?? "");
    setNotes(source.notes ?? "");
    setEditName(!(source.buyerAgentName?.trim() ?? ""));
    setEditEmail(!(source.buyerAgentEmail?.trim() ?? ""));
  }, [source.id, source.buyerAgentName, source.buyerAgentEmail, source.notes]);

  const prepItems = useMemo(
    () =>
      buildShowingPrepChecklist({
        buyerAgentName: name,
        buyerAgentEmail: email,
        notes,
        feedbackRequired: source.feedbackRequired,
        feedbackDraftGeneratedAt: source.feedbackDraftGeneratedAt
          ? new Date(source.feedbackDraftGeneratedAt)
          : null,
        pendingFeedbackFormCount: 0,
        prepChecklistFlags: source.prepChecklistFlags ?? null,
      }),
    [name, email, notes, source.feedbackRequired, source.feedbackDraftGeneratedAt, source.prepChecklistFlags]
  );

  const doneCount = prepItems.filter((i) => i.complete).length;
  const total = prepItems.length;
  const allComplete = doneCount === total;

  const flushSaveFields = useCallback(async () => {
    setAutoSaveState("saving");
    try {
      const res = await fetch(`/api/v1/showing-hq/showings/${source.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerAgentName: name.trim() || null,
          buyerAgentEmail: email.trim() || null,
          notes: notes.trim() ? notes : null,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      onUpdated(json);
      setAutoSaveState("saved");
      window.setTimeout(() => setAutoSaveState("idle"), 1600);
    } catch {
      setAutoSaveState("idle");
    }
  }, [source.id, name, email, notes, onUpdated]);

  const scheduleSaveFields = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void flushSaveFields();
    }, 650);
  }, [flushSaveFields]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const persistFlag = useCallback(
    async (patch: Record<string, boolean>) => {
      setFlagBusy(true);
      try {
        const res = await fetch(`/api/v1/showing-hq/showings/${source.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prepChecklistFlags: mergePrepChecklistFlags(source.prepChecklistFlags, patch),
          }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
        onUpdated(json);
      } finally {
        setFlagBusy(false);
      }
    },
    [source.id, source.prepChecklistFlags, onUpdated]
  );

  const followItem = prepItems.find((i) => i.id === "follow_up");
  const followChecked = followItem?.complete ?? false;

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
            <span className="text-[11px] text-kp-on-surface-variant">Saving…</span>
          ) : autoSaveState === "saved" ? (
            <span className="text-[11px] font-medium text-emerald-400">Saved</span>
          ) : null}
        </div>
        {!allComplete ? (
          <p className="mt-2 text-xs text-amber-200/90">Complete remaining items to move forward.</p>
        ) : (
          <p className="mt-2 text-xs text-emerald-400/90">Prep is in good shape for this showing.</p>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-kp-outline/90 bg-kp-surface-high/20 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-teal/90">
          Complete this to move forward
        </p>

        <div className="rounded-lg border border-kp-outline/60 bg-kp-surface/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-kp-on-surface">Buyer agent name</span>
            {name.trim() && !editName ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(kpBtnTertiary, "h-7 px-2 text-[11px]")}
                onClick={() => setEditName(true)}
              >
                <Pencil className="mr-1 h-3 w-3" aria-hidden />
                Edit
              </Button>
            ) : null}
          </div>
          {!name.trim() || editName ? (
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                scheduleSaveFields();
              }}
              onBlur={() => {
                if (name.trim()) setEditName(false);
                void flushSaveFields();
              }}
              placeholder="Name as it should appear in outreach"
              className="mt-2 h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface placeholder:text-kp-on-surface-variant/70"
            />
          ) : (
            <p className="mt-2 text-sm text-kp-on-surface">{name}</p>
          )}
        </div>

        <div className="rounded-lg border border-kp-outline/60 bg-kp-surface/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-kp-on-surface">Buyer agent email</span>
            {email.trim() && !editEmail ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(kpBtnTertiary, "h-7 px-2 text-[11px]")}
                onClick={() => setEditEmail(true)}
              >
                <Pencil className="mr-1 h-3 w-3" aria-hidden />
                Edit
              </Button>
            ) : null}
          </div>
          {!email.trim() || editEmail ? (
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                scheduleSaveFields();
              }}
              onBlur={() => {
                if (email.trim()) setEditEmail(false);
                void flushSaveFields();
              }}
              placeholder="Work email for feedback request"
              className="mt-2 h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface placeholder:text-kp-on-surface-variant/70"
            />
          ) : (
            <p className="mt-2 text-sm text-kp-on-surface">{email}</p>
          )}
        </div>

        <div className="rounded-lg border border-kp-outline/60 bg-kp-surface/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-kp-on-surface">Notes / instructions</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(kpBtnTertiary, "h-7 px-2 text-[11px]")}
              onClick={() => setNotesExpanded((v) => !v)}
            >
              {notesExpanded ? "Collapse" : "Expand"}
            </Button>
          </div>
          <textarea
            rows={notesExpanded ? 8 : 3}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              scheduleSaveFields();
            }}
            onBlur={() => void flushSaveFields()}
            placeholder="Gate codes, parking, buyer context…"
            className="mt-2 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm text-kp-on-surface placeholder:text-kp-on-surface-variant/70"
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-kp-outline/60 bg-kp-surface/40 px-3 py-3">
          <div>
            <p className="text-xs font-medium text-kp-on-surface">Follow-up path ready</p>
            <p className="mt-0.5 text-[11px] text-kp-on-surface-variant">
              Toggle when your CRM or next steps are lined up
            </p>
          </div>
          <ToggleSwitch
            id="prep-follow-ready"
            label="Follow-up path ready"
            checked={followChecked}
            disabled={flagBusy}
            onCheckedChange={(next) => void persistFlag({ followUpPathReady: next })}
          />
        </div>
      </div>
    </div>
  );
}

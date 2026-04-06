"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { TimeQuickChips } from "@/components/ui/time-input";
import {
  applyQuickTimePreset,
  dateToLocalDateInput,
  dateToLocalTimeInput,
  datetimeLocalInputValueToIso,
  mergeLocalPartsToDatetimeLocalValue,
  splitDatetimeLocalInputValue,
} from "@/lib/datetime/local-scheduling";
import { AF, afError } from "@/lib/ui/action-feedback";

type Props = {
  visitorId: string;
  contactId: string;
  contactName: string;
  onCreated: () => void;
};

export function CreateVisitorFollowUpInline({
  visitorId,
  contactId,
  contactName,
  onCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(`Follow up: ${contactName}`);
  const [dueAt, setDueAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return mergeLocalPartsToDatetimeLocalValue(dateToLocalDateInput(d), dateToLocalTimeInput(d));
  });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dueIso = datetimeLocalInputValueToIso(dueAt);
      if (!dueIso) throw new Error("Invalid date");
      const res = await fetch("/api/v1/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          sourceType: "OPEN_HOUSE",
          sourceId: visitorId,
          title: title.trim(),
          dueAt: dueIso,
          priority: "MEDIUM",
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) throw new Error(json.error?.message ?? "Could not create");
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(afError(err, AF.couldntCreateFollowUp));
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(kpBtnSecondary, "h-7 text-[11px]")}
        onClick={() => setOpen(true)}
      >
        Follow-up
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-1 min-w-[200px] space-y-1.5 rounded-md border border-kp-outline bg-kp-surface-high/40 p-2"
      onClick={(e) => e.stopPropagation()}
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-8 border-kp-outline bg-kp-surface text-xs"
        required
      />
      <Input
        type="datetime-local"
        value={dueAt}
        onChange={(e) => setDueAt(e.target.value)}
        className="h-8 border-kp-outline bg-kp-surface text-xs"
        required
      />
      <TimeQuickChips
        density="compact"
        className="gap-1"
        onSelect={(p) => {
          const parts = splitDatetimeLocalInputValue(dueAt);
          const next = applyQuickTimePreset(p, parts ?? undefined);
          setDueAt(mergeLocalPartsToDatetimeLocalValue(next.date, next.time));
        }}
      />
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="min-h-[56px] border-kp-outline bg-kp-surface text-xs"
      />
      <div className="flex gap-1">
        <Button
          type="submit"
          size="sm"
          className={cn(kpBtnPrimary, "h-7 flex-1 border-transparent text-[11px]")}
          disabled={saving}
        >
          {saving ? AF.saving : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(kpBtnSecondary, "h-7 text-[11px]")}
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

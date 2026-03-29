"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";

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
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const due = new Date(dueAt);
      if (Number.isNaN(due.getTime())) throw new Error("Invalid date");
      const res = await fetch("/api/v1/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          sourceType: "OPEN_HOUSE",
          sourceId: visitorId,
          title: title.trim(),
          dueAt: due.toISOString(),
          priority: "MEDIUM",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) throw new Error(json.error?.message ?? "Could not create");
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
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
      {error ? <p className="text-[11px] text-red-400">{error}</p> : null}
      <div className="flex gap-1">
        <Button
          type="submit"
          size="sm"
          className={cn(kpBtnPrimary, "h-7 flex-1 border-transparent text-[11px]")}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
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

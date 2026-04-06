"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary } from "@/components/ui/kp-dashboard-button-tiers";

type ContactOption = {
  id: string;
  firstName: string;
  lastName: string;
};

export type NewTaskModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, contact select defaults to this id (e.g. contact detail). */
  defaultContactId?: string | null;
  onCreated?: () => void;
};

function contactLabel(c: ContactOption) {
  return `${c.firstName} ${c.lastName}`.trim() || "Unknown";
}

export function NewTaskModal({
  open,
  onOpenChange,
  defaultContactId,
  onCreated,
}: NewTaskModalProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [contactId, setContactId] = useState<string>("");
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDueDate("");
    setContactId(defaultContactId ?? "");
    setSubmitting(false);
    setLoadingContacts(true);
    fetch("/api/v1/contacts")
      .then((r) => r.json())
      .then((j) => setContacts(Array.isArray(j.data) ? j.data : []))
      .catch(() => setContacts([]))
      .finally(() => setLoadingContacts(false));
  }, [open, defaultContactId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          dueDate: dueDate.trim() || null,
          contactId: contactId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not create task");
      toast.success("Task created");
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create task");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-kp-outline bg-kp-surface-high/25 px-3 py-2 text-sm text-kp-on-surface placeholder:text-kp-on-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-teal/50";

  return (
    <BrandModal
      open={open}
      onOpenChange={onOpenChange}
      title="New task"
      description="Quick capture — optional due date and contact."
      size="sm"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-kp-on-surface-variant"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="new-task-form"
            size="sm"
            disabled={submitting || !title.trim()}
            className={cn(kpBtnPrimary)}
          >
            {submitting ? "Saving…" : "Create"}
          </Button>
        </>
      }
    >
      <form id="new-task-form" className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="task-title" className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
            Title
          </label>
          <input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="What needs to happen?"
            autoFocus
            maxLength={500}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="task-due" className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
            Due date (optional)
          </label>
          <input
            id="task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="task-contact" className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
            Contact (optional)
          </label>
          <select
            id="task-contact"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            disabled={loadingContacts}
            className={cn(inputClass, "cursor-pointer")}
          >
            <option value="">— None —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {contactLabel(c)}
              </option>
            ))}
          </select>
        </div>
      </form>
    </BrandModal>
  );
}

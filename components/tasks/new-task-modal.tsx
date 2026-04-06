"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary } from "@/components/ui/kp-dashboard-button-tiers";
import { buildDueAtIsoFromDateAndTimeLocal } from "@/lib/tasks/parse-task-due-at";

type ContactOption = {
  id: string;
  firstName: string;
  lastName: string;
};

type PropertyOption = {
  id: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
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

function propertyLabel(p: PropertyOption) {
  return `${p.address1}, ${p.city}, ${p.state} ${p.zip}`.trim();
}

export function NewTaskModal({
  open,
  onOpenChange,
  defaultContactId,
  onCreated,
}: NewTaskModalProps) {
  const [title, setTitle] = useState("");
  const [dueDatePart, setDueDatePart] = useState("");
  const [dueTimePart, setDueTimePart] = useState("");
  const [contactId, setContactId] = useState<string>("");
  const [propertyId, setPropertyId] = useState<string>("");
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDueDatePart("");
    setDueTimePart("");
    setContactId(defaultContactId ?? "");
    setPropertyId("");
    setSubmitting(false);
    setLoadingContacts(true);
    fetch("/api/v1/contacts")
      .then((r) => r.json())
      .then((j) => setContacts(Array.isArray(j.data) ? j.data : []))
      .catch(() => setContacts([]))
      .finally(() => setLoadingContacts(false));
    setLoadingProperties(true);
    fetch("/api/v1/properties")
      .then((r) => r.json())
      .then((j) => setProperties(Array.isArray(j.data) ? j.data : []))
      .catch(() => setProperties([]))
      .finally(() => setLoadingProperties(false));
  }, [open, defaultContactId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t || submitting) return;
    const dueAtIso = buildDueAtIsoFromDateAndTimeLocal(dueDatePart, dueTimePart);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          dueAt: dueAtIso,
          contactId: contactId || null,
          propertyId: propertyId || null,
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
      description="Optional due date and time, contact, and listing."
      size="md"
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="task-due-date" className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
              Due date (optional)
            </label>
            <input
              id="task-due-date"
              type="date"
              value={dueDatePart}
              onChange={(e) => setDueDatePart(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="task-due-time" className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
              Time (optional)
            </label>
            <input
              id="task-due-time"
              type="time"
              value={dueTimePart}
              onChange={(e) => setDueTimePart(e.target.value)}
              disabled={!dueDatePart.trim()}
              className={cn(inputClass, !dueDatePart.trim() && "opacity-50")}
            />
          </div>
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
        <div className="space-y-1.5">
          <label htmlFor="task-property" className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
            Property (optional)
          </label>
          <select
            id="task-property"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            disabled={loadingProperties}
            className={cn(inputClass, "cursor-pointer")}
          >
            <option value="">— None —</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {propertyLabel(p)}
              </option>
            ))}
          </select>
        </div>
      </form>
    </BrandModal>
  );
}

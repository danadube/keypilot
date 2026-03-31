"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { BrandModal } from "@/components/ui/BrandModal";
import { cn } from "@/lib/utils";

export type CreateContactModalProps = {
  open: boolean;
  /** Strip `?new=1` and return to the list surface (preserve segment filters). */
  onDismiss: () => void;
  /** After a successful create; use for refreshing the list. */
  onCreated: (contactId: string) => void;
};

export function CreateContactModal({
  open,
  onDismiss,
  onCreated,
}: CreateContactModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setError(null);
    setSubmitting(false);
  }, [open]);

  function handleOpenChange(next: boolean) {
    if (!next) onDismiss();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: { id: string };
        error?: { message?: string };
      };
      if (!res.ok) {
        const msg =
          json.error?.message ??
          (res.status === 409
            ? "Couldn't create contact"
            : "Couldn't create contact");
        setError(msg);
        return;
      }
      const id = json.data?.id;
      if (!id) {
        setError("Couldn't create contact");
        return;
      }
      onCreated(id);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    firstName.trim().length > 0 && lastName.trim().length > 0 && !submitting;

  const inputClass = cn(
    "w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm text-kp-on-surface",
    "placeholder:text-kp-on-surface-placeholder focus:border-kp-teal focus:outline-none focus:ring-2 focus:ring-kp-teal/35"
  );

  return (
    <BrandModal
      open={open}
      onOpenChange={handleOpenChange}
      title="New contact"
      description="Add someone directly to your workspace. They’ll appear in your contacts list with source Manual."
      size="sm"
      bodyClassName="max-h-[min(70vh,520px)] overflow-y-auto"
      footer={
        <div className="flex w-full justify-end gap-2">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
            className="rounded-lg border border-kp-outline px-3 py-2 text-xs font-medium text-kp-on-surface transition-colors hover:bg-kp-surface-high disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-contact-form"
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-kp-teal px-3 py-2 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Creating…
              </>
            ) : (
              "Save contact"
            )}
          </button>
        </div>
      }
    >
      <form id="create-contact-form" className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-kp-on-surface-muted">
              First name
            </label>
            <input
              className={inputClass}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-kp-on-surface-muted">
              Last name
            </label>
            <input
              className={inputClass}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-kp-on-surface-muted">
            Email <span className="font-normal">(optional)</span>
          </label>
          <input
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-kp-on-surface-muted">
            Phone <span className="font-normal">(optional)</span>
          </label>
          <input
            type="tel"
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-kp-on-surface-muted">
            Notes <span className="font-normal">(optional)</span>
          </label>
          <textarea
            className={cn(inputClass, "min-h-[72px] resize-y")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </form>
    </BrandModal>
  );
}

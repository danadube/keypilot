"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BrandModal } from "@/components/ui/BrandModal";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save (before navigation to detail). */
  onCreated?: () => void;
};

export function CreateContactModal({ open, onOpenChange, onCreated }: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setError(null);
  }

  useEffect(() => {
    if (!open) return;
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setError(null);
  }, [open]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: email.trim() || "",
          phone: phone.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Could not create contact");
      }
      const id = json.data?.id as string | undefined;
      if (!id) throw new Error("Invalid response");
      onOpenChange(false);
      onCreated?.();
      router.push(`/contacts/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BrandModal
      open={open}
      onOpenChange={(v) => {
        if (!v && !saving) reset();
        onOpenChange(v);
      }}
      title="New contact"
      description="Add someone to your list. They appear alongside open house sign-ins."
      size="sm"
      footer={
        <div className="flex w-full justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-kp-outline px-3 py-2 text-xs font-medium text-kp-on-surface transition-colors hover:bg-kp-surface-high disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSubmit()}
            className="inline-flex items-center gap-2 rounded-lg bg-kp-teal px-3 py-2 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save contact"
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-kp-on-surface-variant">
              First name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={cn(
                "w-full rounded-lg border border-kp-outline bg-kp-bg px-3 py-2 text-sm text-kp-on-surface",
                "placeholder:text-kp-on-surface-variant focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
              )}
              autoComplete="given-name"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-kp-on-surface-variant">
              Last name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={cn(
                "w-full rounded-lg border border-kp-outline bg-kp-bg px-3 py-2 text-sm text-kp-on-surface",
                "placeholder:text-kp-on-surface-variant focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
              )}
              autoComplete="family-name"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-kp-on-surface-variant">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="optional if phone is set"
            className={cn(
              "w-full rounded-lg border border-kp-outline bg-kp-bg px-3 py-2 text-sm text-kp-on-surface",
              "placeholder:text-kp-on-surface-variant focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
            )}
            autoComplete="email"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-kp-on-surface-variant">
            Phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="optional if email is set"
            className={cn(
              "w-full rounded-lg border border-kp-outline bg-kp-bg px-3 py-2 text-sm text-kp-on-surface",
              "placeholder:text-kp-on-surface-variant focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
            )}
            autoComplete="tel"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-kp-on-surface-variant">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional"
            className={cn(
              "w-full resize-none rounded-lg border border-kp-outline bg-kp-bg px-3 py-2 text-sm text-kp-on-surface",
              "placeholder:text-kp-on-surface-variant focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
            )}
          />
        </div>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>
    </BrandModal>
  );
}

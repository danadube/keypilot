"use client";

import { useState } from "react";
import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";

const KP_FIELD =
  "h-10 rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface shadow-none placeholder:text-kp-on-surface-variant/75 focus-visible:border-kp-outline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-400 focus-visible:ring-offset-0 disabled:opacity-50";

const KP_SELECT_TRIGGER = cn(
  KP_FIELD,
  "flex w-full items-center justify-between text-left [&>span]:line-clamp-1"
);

const KP_SELECT_CONTENT =
  "max-h-72 border border-kp-outline bg-kp-surface text-kp-on-surface shadow-lg";

const KP_SELECT_ITEM =
  "cursor-pointer rounded-md py-2 pl-2 pr-8 text-sm text-kp-on-surface focus:bg-kp-surface-high focus:text-kp-on-surface data-[highlighted]:bg-kp-surface-high data-[highlighted]:text-kp-on-surface";

type InviteHostDialogProps = {
  openHouseId: string;
  onInviteSent?: () => void;
};

const ROLES = [
  { value: "HOST_AGENT", label: "Host agent" },
  { value: "ASSISTANT", label: "Assistant" },
] as const;

export function InviteHostDialog({ openHouseId, onInviteSent }: InviteHostDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"HOST_AGENT" | "ASSISTANT">("HOST_AGENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/open-houses/${openHouseId}/host-invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setSuccess(true);
      setEmail("");
      setRole("HOST_AGENT");
      onInviteSent?.();
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(kpBtnSecondary, "h-8 text-xs")}
        onClick={() => setOpen(true)}
      >
        <UserPlus className="mr-1.5 h-3.5 w-3.5" />
        Invite host
      </Button>
      <BrandModal
        open={open}
        onOpenChange={setOpen}
        title="Invite host"
        description="Send an email invite with a secure link to the host dashboard. They can view the QR code, visitor list, and submit feedback."
        size="sm"
        className="shadow-lg"
        descriptionClassName="text-sm leading-relaxed text-kp-on-surface-variant"
        footer={
          success ? undefined : (
            <div className="flex w-full justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className={cn(kpBtnSecondary, "h-9")}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="invite-host-form"
                variant="outline"
                className={cn(kpBtnPrimary, "h-9 border-transparent")}
                disabled={loading}
              >
                {loading ? "Sending…" : "Send invite"}
              </Button>
            </div>
          )
        }
      >
        {success ? (
          <p className="py-4 text-center text-sm font-medium text-emerald-400">Invite sent successfully.</p>
        ) : (
          <form id="invite-host-form" onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-sm font-medium text-kp-on-surface">
                Email
              </Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="host@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={KP_FIELD}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-kp-on-surface">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "HOST_AGENT" | "ASSISTANT")}>
                <SelectTrigger className={KP_SELECT_TRIGGER}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={KP_SELECT_CONTENT}>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value} className={KP_SELECT_ITEM}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>
        )}
      </BrandModal>
    </>
  );
}

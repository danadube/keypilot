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

type InviteHostDialogProps = {
  openHouseId: string;
  onInviteSent?: () => void;
  trigger?: React.ReactNode;
};

const ROLES = [
  { value: "HOST_AGENT", label: "Host agent" },
  { value: "ASSISTANT", label: "Assistant" },
] as const;

export function InviteHostDialog({
  openHouseId,
  onInviteSent,
  trigger,
}: InviteHostDialogProps) {
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
      <div onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button variant="outline" size="sm" className={cn(kpBtnSecondary)}>
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Invite host
          </Button>
        )}
      </div>
      <BrandModal
        open={open}
        onOpenChange={setOpen}
        title="Invite host"
        description="Send an email invite with a secure link to the host dashboard. They can view the QR code, visitor list, and submit feedback."
        size="sm"
        footer={
          success ? undefined : (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className={cn(kpBtnSecondary)}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="invite-host-form"
                variant="outline"
                className={cn(kpBtnPrimary, "border-transparent")}
                disabled={loading}
              >
                {loading ? "Sending..." : "Send invite"}
              </Button>
            </div>
          )
        }
      >
        {success ? (
          <p className="py-4 text-center text-sm font-medium text-green-600">
            Invite sent successfully.
          </p>
        ) : (
          <form id="invite-host-form" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="host@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "HOST_AGENT" | "ASSISTANT")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
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

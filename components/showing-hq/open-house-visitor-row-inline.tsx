"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { kpBtnSecondary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import { InterestBadge } from "@/components/shared/InterestBadge";
import { CreateVisitorFollowUpInline } from "@/components/open-houses/CreateVisitorFollowUpInline";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type OpenHouseVisitorRowModel = {
  id: string;
  leadStatus: string | null;
  interestLevel: string | null;
  submittedAt: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
};

const LEAD_OPTIONS = ["NEW", "INTERESTED", "HOT_BUYER", "SELLER_LEAD", "NEIGHBOR", "ARCHIVED"] as const;

const INTEREST_OPTIONS = ["VERY_INTERESTED", "MAYBE_INTERESTED", "JUST_BROWSING"] as const;

function fullName(c: { firstName: string; lastName: string }) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown";
}

export function OpenHouseVisitorRowInline({
  v,
  formatDateTime,
  onRefresh,
}: {
  v: OpenHouseVisitorRowModel;
  formatDateTime: (iso: string) => string;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(v.contact.firstName);
  const [lastName, setLastName] = useState(v.contact.lastName);
  const [email, setEmail] = useState(v.contact.email ?? "");
  const [phone, setPhone] = useState(v.contact.phone ?? "");
  const [leadStatus, setLeadStatus] = useState(v.leadStatus ?? "NEW");
  const [interestLevel, setInterestLevel] = useState<string>(v.interestLevel ?? "");

  const resetFromProps = () => {
    setFirstName(v.contact.firstName);
    setLastName(v.contact.lastName);
    setEmail(v.contact.email ?? "");
    setPhone(v.contact.phone ?? "");
    setLeadStatus(v.leadStatus ?? "NEW");
    setInterestLevel(v.interestLevel ?? "");
  };

  const startEdit = () => {
    resetFromProps();
    setErr(null);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/v1/showing-hq/visitors/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadStatus,
          interestLevel: interestLevel ? interestLevel : null,
          contact: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            phone: phone.trim() || null,
          },
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setEditing(false);
      onRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const resendFlyer = async () => {
    setResending(true);
    setErr(null);
    try {
      const res = await fetch(`/api/v1/showing-hq/visitors/${v.id}/resend-flyer`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      onRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not resend");
    } finally {
      setResending(false);
    }
  };

  if (editing) {
    return (
      <tr className="align-top">
        <td className="py-2" colSpan={7}>
          <div className="flex flex-col gap-3 rounded-lg border border-kp-outline/80 bg-kp-surface-high/40 p-3">
            {err ? <p className="text-xs text-red-400">{err}</p> : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-[10px] font-medium text-kp-on-surface-variant">First name</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-0.5 h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-kp-on-surface-variant">Last name</label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-0.5 h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-kp-on-surface-variant">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-0.5 h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-kp-on-surface-variant">Phone</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-0.5 h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-[10px] font-medium text-kp-on-surface-variant">Interest</label>
                <Select
                  value={interestLevel || "__none__"}
                  onValueChange={(x) => setInterestLevel(x === "__none__" ? "" : x)}
                >
                  <SelectTrigger className="mt-0.5 h-8 text-sm">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {INTEREST_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-kp-on-surface-variant">Lead status</label>
                <Select value={leadStatus} onValueChange={setLeadStatus}>
                  <SelectTrigger className="mt-0.5 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className={cn(kpBtnSecondary, "h-7 text-xs")}
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? "Saving…" : "Save visitor"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(kpBtnTertiary, "h-7 text-xs")}
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  resetFromProps();
                  setErr(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="align-top hover:bg-kp-surface-high/50">
      <td className="py-2 font-medium text-kp-on-surface">{fullName(v.contact)}</td>
      <td className="py-2 text-kp-on-surface-variant">{v.contact.email ?? "—"}</td>
      <td className="py-2 text-kp-on-surface-variant">{v.contact.phone ?? "—"}</td>
      <td className="py-2">
        <InterestBadge interestLevel={v.interestLevel} />
      </td>
      <td className="py-2 text-kp-on-surface-variant">{formatDateTime(v.submittedAt)}</td>
      <td className="py-2">
        <LeadStatusBadge status={v.leadStatus} />
      </td>
      <td className="py-2 align-top">
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(kpBtnTertiary, "h-7 w-full justify-end gap-1 text-xs")}
            onClick={startEdit}
          >
            <Pencil className="h-3 w-3 shrink-0" aria-hidden />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(kpBtnTertiary, "h-7 w-full justify-end text-xs")}
            disabled={resending || !v.contact.email?.trim()}
            onClick={() => void resendFlyer()}
            title={!v.contact.email?.trim() ? "Add email to resend flyer" : "Resend flyer email"}
          >
            {resending ? "Sending…" : "Resend flyer"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(kpBtnTertiary, "h-7 w-full justify-end text-xs")}
            asChild
          >
            <Link href={`/showing-hq/visitors/${v.id}`}>Profile</Link>
          </Button>
          <div className="w-full">
              <CreateVisitorFollowUpInline
              visitorId={v.id}
              contactId={v.contact.id}
              contactName={fullName(v.contact)}
              onCreated={onRefresh}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}

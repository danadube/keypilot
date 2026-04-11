"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { ArrowLeft } from "lucide-react";
import type { ContactDetailContact } from "./contact-detail-types";
import { ContactPrimaryInfoCard } from "./contact-primary-info-card";
import { contactStatusBadgeVariant } from "./contact-detail-utils";

type ContactDetailIdentityColumnProps = {
  className?: string;
  fullName: string;
  initials: string;
  contact: ContactDetailContact;
  hasCrmAccess: boolean;
  currentUserId: string | null;
  isAssignedToMe: boolean;
  tagName: string;
  addingTag: boolean;
  onTagNameChange: (v: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tagId: string) => void;
  onAssignToMe: () => void;
  onUnassign: () => void;
};

export function ContactDetailIdentityColumn({
  className,
  fullName,
  initials,
  contact,
  hasCrmAccess,
  currentUserId,
  isAssignedToMe,
  tagName,
  addingTag,
  onTagNameChange,
  onAddTag,
  onRemoveTag,
  onAssignToMe,
  onUnassign,
}: ContactDetailIdentityColumnProps) {
  const status = contact.status;

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-xl border border-kp-outline/80 bg-kp-surface p-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto",
        className
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        className={cn(kpBtnTertiary, "h-7 w-fit gap-1 px-1.5 text-[11px]")}
        asChild
      >
        <Link href="/contacts">
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
          Contacts
        </Link>
      </Button>

      <div className="flex gap-2.5 sm:items-start">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-kp-outline/70 bg-kp-surface-high/80 text-sm font-semibold text-kp-on-surface"
          aria-hidden
        >
          {initials || "—"}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h1 className="text-balance text-lg font-semibold leading-tight tracking-tight text-kp-on-surface">
            {fullName || "—"}
          </h1>
          <p className="mt-0.5 text-[11px] text-kp-on-surface-variant/90">{contact.source}</p>
          {status && hasCrmAccess ? (
            <div className="mt-2">
              <StatusBadge variant={contactStatusBadgeVariant(status)}>
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </StatusBadge>
            </div>
          ) : null}
        </div>
      </div>

      <ContactPrimaryInfoCard
        contact={contact}
        hasCrmAccess={hasCrmAccess}
        currentUserId={currentUserId}
        isAssignedToMe={isAssignedToMe}
        tagName={tagName}
        addingTag={addingTag}
        onTagNameChange={onTagNameChange}
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        onAssignToMe={onAssignToMe}
        onUnassign={onUnassign}
        variant="rail"
        railCompact
      />
    </div>
  );
}

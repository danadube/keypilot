"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  kpBtnSecondary,
  kpBtnTertiary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { ArrowLeft, CheckSquare, Mail, Phone, StickyNote } from "lucide-react";
import { CONTACT_STATUSES, type ContactDetailContact } from "./contact-detail-types";
import { ContactPrimaryInfoCard } from "./contact-primary-info-card";

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
  onStatusChange: (status: string) => void;
  onPromoteFromFarmToLead?: () => void;
  promotingFromFarm: boolean;
  onScrollToNote: () => void;
  onOpenTaskModal: () => void;
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
  onStatusChange,
  onPromoteFromFarmToLead,
  promotingFromFarm,
  onScrollToNote,
  onOpenTaskModal,
}: ContactDetailIdentityColumnProps) {
  const status = contact.status;
  const primaryEmail = contact.email?.trim() || null;
  const primaryPhone = contact.phone?.trim() || null;

  const quickBtn =
    "h-7 gap-1 border-kp-outline/40 bg-transparent px-2 text-[11px] font-normal text-kp-on-surface shadow-none hover:bg-kp-surface-high/60";

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
          <p className="mt-0.5 text-[11px] text-kp-on-surface-variant/90">
            {contact.source}
          </p>
        </div>
      </div>

      {hasCrmAccess ? (
        <div className="space-y-1.5 border-t border-kp-outline/40 pt-2">
          <p className="text-[9px] font-medium uppercase tracking-wide text-kp-on-surface-variant/85">
            Stage
          </p>
          <Select value={status || "LEAD"} onValueChange={onStatusChange}>
            <SelectTrigger className="h-8 w-full border-kp-outline/70 bg-kp-surface-high/50 text-xs text-kp-on-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-kp-outline bg-kp-surface text-kp-on-surface">
              {CONTACT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {status === "FARM" && onPromoteFromFarmToLead ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(kpBtnSecondary, "h-7 w-full border-kp-outline/50 text-[11px] font-normal")}
              onClick={onPromoteFromFarmToLead}
              disabled={promotingFromFarm}
            >
              {promotingFromFarm ? "Promoting…" : "Promote to Lead"}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="border-t border-kp-outline/40 pt-2">
        <p className="mb-1.5 text-[9px] font-medium uppercase tracking-wide text-kp-on-surface-variant/85">
          Quick actions
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(kpBtnTertiary, quickBtn)}
            disabled={!primaryPhone}
            asChild={!!primaryPhone}
          >
            {primaryPhone ? (
              <a href={`tel:${primaryPhone}`}>
                <Phone className="h-3 w-3 shrink-0 opacity-80" />
                Call
              </a>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Call
              </span>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(kpBtnTertiary, quickBtn)}
            disabled={!primaryEmail}
            asChild={!!primaryEmail}
          >
            {primaryEmail ? (
              <a href={`mailto:${primaryEmail}`}>
                <Mail className="h-3 w-3 shrink-0 opacity-80" />
                Email
              </a>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Email
              </span>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(kpBtnTertiary, quickBtn)}
            onClick={onScrollToNote}
          >
            <StickyNote className="h-3 w-3 shrink-0 opacity-80" />
            Note
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(kpBtnTertiary, quickBtn)}
            onClick={onOpenTaskModal}
          >
            <CheckSquare className="h-3 w-3 shrink-0 opacity-80" />
            Task
          </Button>
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

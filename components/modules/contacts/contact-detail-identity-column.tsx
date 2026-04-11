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

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto",
        className
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        className={cn(kpBtnTertiary, "h-8 w-fit gap-1.5 px-2")}
        asChild
      >
        <Link href="/contacts">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Contacts
        </Link>
      </Button>

      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-kp-outline/80 bg-kp-surface-high text-lg font-semibold text-kp-on-surface"
          aria-hidden
        >
          {initials || "—"}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-balance text-xl font-bold tracking-tight text-kp-on-surface">
            {fullName || "—"}
          </h1>
          <p className="mt-0.5 text-xs text-kp-on-surface-variant">
            Source · {contact.source}
          </p>
        </div>
      </div>

      {hasCrmAccess ? (
        <div className="space-y-2 border-t border-kp-outline/60 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
            Stage
          </p>
          <Select value={status || "LEAD"} onValueChange={onStatusChange}>
            <SelectTrigger className="h-9 w-full border-kp-outline bg-kp-surface-high text-kp-on-surface">
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
              className={cn(kpBtnSecondary, "h-8 w-full border-transparent text-xs")}
              onClick={onPromoteFromFarmToLead}
              disabled={promotingFromFarm}
            >
              {promotingFromFarm ? "Promoting…" : "Promote to Lead"}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="border-t border-kp-outline/60 pt-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
          Quick actions
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(kpBtnSecondary, "h-9 justify-center gap-1.5 border-kp-outline/80 text-xs")}
            disabled={!primaryPhone}
            asChild={!!primaryPhone}
          >
            {primaryPhone ? (
              <a href={`tel:${primaryPhone}`}>
                <Phone className="h-3.5 w-3.5 shrink-0" />
                Call
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Call
              </span>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(kpBtnSecondary, "h-9 justify-center gap-1.5 border-kp-outline/80 text-xs")}
            disabled={!primaryEmail}
            asChild={!!primaryEmail}
          >
            {primaryEmail ? (
              <a href={`mailto:${primaryEmail}`}>
                <Mail className="h-3.5 w-3.5 shrink-0" />
                Email
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Email
              </span>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(kpBtnSecondary, "h-9 justify-center gap-1.5 border-kp-outline/80 text-xs")}
            onClick={onScrollToNote}
          >
            <StickyNote className="h-3.5 w-3.5 shrink-0" />
            Note
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(kpBtnSecondary, "h-9 justify-center gap-1.5 border-kp-outline/80 text-xs")}
            onClick={onOpenTaskModal}
          >
            <CheckSquare className="h-3.5 w-3.5 shrink-0" />
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
      />
    </div>
  );
}

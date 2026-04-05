"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { Mail, Phone, Tag, User, X } from "lucide-react";
import { ContactDetailSection } from "./contact-detail-section";
import type { ContactDetailContact } from "./contact-detail-types";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-24 shrink-0 text-xs font-medium text-kp-on-surface-variant">
        {label}
      </span>
      <div className="min-w-0 flex-1 text-sm text-kp-on-surface">{value}</div>
    </div>
  );
}

type ContactPrimaryInfoCardProps = {
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

export function ContactPrimaryInfoCard({
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
}: ContactPrimaryInfoCardProps) {
  const tags = contact.contactTags ?? [];

  return (
    <ContactDetailSection
      title="Contact"
      description={`Source · ${contact.source}`}
    >
      <div className="space-y-4">
        {hasCrmAccess && currentUserId ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-kp-outline pb-3">
            <div className="text-xs text-kp-on-surface-variant">
              {contact.assignedToUserId ? (
                isAssignedToMe ? (
                  <span className="text-kp-on-surface">
                    Assigned to <span className="font-medium">you</span>
                  </span>
                ) : (
                  <span>Assigned to another teammate</span>
                )
              ) : (
                <span>Unassigned</span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className={cn(kpBtnSecondary, "h-8 shrink-0 text-xs")}
              onClick={isAssignedToMe ? onUnassign : onAssignToMe}
            >
              <User className="mr-1.5 h-3 w-3" />
              {isAssignedToMe ? "Unassign" : "Assign to me"}
            </Button>
          </div>
        ) : null}

        <div className="space-y-2.5">
          {(
            [
              ["Email", contact.email],
              ["Email 2", contact.email2 ?? null],
              ["Email 3", contact.email3 ?? null],
              ["Email 4", contact.email4 ?? null],
            ] as const
          ).map(([label, value]) => {
            if (!value && label !== "Email") return null;
            return (
              <InfoRow
                key={label}
                label={label}
                value={
                  value ? (
                    <a
                      href={`mailto:${value}`}
                      className="inline-flex items-center gap-1 break-all text-kp-teal hover:underline"
                    >
                      <Mail className="h-3 w-3 shrink-0" />
                      {value}
                    </a>
                  ) : (
                    <span className="text-kp-on-surface-variant">—</span>
                  )
                }
              />
            );
          })}
          {(
            [
              ["Phone", contact.phone],
              ["Phone 2", contact.phone2 ?? null],
            ] as const
          ).map(([label, value]) => {
            if (!value && label !== "Phone") return null;
            return (
              <InfoRow
                key={label}
                label={label}
                value={
                  value ? (
                    <a
                      href={`tel:${value}`}
                      className="inline-flex items-center gap-1 text-kp-teal hover:underline"
                    >
                      <Phone className="h-3 w-3 shrink-0" />
                      {value}
                    </a>
                  ) : (
                    <span className="text-kp-on-surface-variant">—</span>
                  )
                }
              />
            );
          })}
          {contact.hasAgent != null ? (
            <InfoRow
              label="Has agent"
              value={contact.hasAgent ? "Yes" : "No"}
            />
          ) : null}
          {contact.timeline ? (
            <InfoRow label="Timeline" value={contact.timeline} />
          ) : null}
        </div>

        {hasCrmAccess ? (
          <div className="border-t border-kp-outline pt-4">
            <div className="mb-3 flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-kp-on-surface-variant" />
              <span className="text-xs font-semibold text-kp-on-surface">
                Tags
              </span>
            </div>
            {tags.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {tags.map((ct) => (
                  <span
                    key={ct.tag.id}
                    className="inline-flex items-center gap-1 rounded-full bg-kp-teal/15 px-2.5 py-0.5 text-xs font-medium text-kp-teal"
                  >
                    {ct.tag.name}
                    <button
                      type="button"
                      onClick={() => onRemoveTag(ct.tag.id)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-kp-teal/20"
                      aria-label={`Remove ${ct.tag.name}`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Input
                placeholder="Add tag…"
                value={tagName}
                onChange={(e) => onTagNameChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAddTag()}
                className="h-8 flex-1 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface placeholder:text-kp-on-surface-variant focus-visible:ring-kp-teal"
              />
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnPrimary, "h-8 border-transparent px-3 text-xs")}
                onClick={onAddTag}
                disabled={!tagName.trim() || addingTag}
              >
                {addingTag ? "Adding…" : "Add"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </ContactDetailSection>
  );
}

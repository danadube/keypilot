"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { Mail, Phone, Tag, User, X } from "lucide-react";
import { ContactDetailSection } from "./contact-detail-section";
import type { ContactDetailContact } from "./contact-detail-types";

function InfoRow({
  label,
  value,
  dense,
}: {
  label: string;
  value: React.ReactNode;
  dense?: boolean;
}) {
  return (
    <div className={cn("flex items-baseline", dense ? "gap-1.5" : "gap-2")}>
      <span
        className={cn(
          "shrink-0 text-kp-on-surface-variant",
          dense ? "w-[4.5rem] text-[10px]" : "w-24 text-xs font-medium"
        )}
      >
        {label}
      </span>
      <div
        className={cn(
          "min-w-0 flex-1 text-kp-on-surface",
          dense ? "text-xs leading-snug" : "text-sm"
        )}
      >
        {value}
      </div>
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
  /** Compact rail layout for the identity column (no outer section card). */
  variant?: "default" | "rail";
  /** Tighter typography and lighter tags when variant is rail. */
  railCompact?: boolean;
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
  variant = "default",
  railCompact = false,
}: ContactPrimaryInfoCardProps) {
  const tags = contact.contactTags ?? [];
  const rail = variant === "rail";
  const compact = rail && railCompact;

  const inner = (
    <div className={cn(compact ? "space-y-2" : rail ? "space-y-3" : "space-y-4")}>
        {hasCrmAccess && currentUserId ? (
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-2",
              compact ? "pb-2" : "pb-3",
              rail ? "border-b border-kp-outline/60" : "border-b border-kp-outline"
            )}
          >
            <div
              className={cn(
                "text-kp-on-surface-variant",
                compact ? "text-[10px] leading-tight" : "text-xs"
              )}
            >
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
              className={cn(
                kpBtnSecondary,
                compact ? "h-7 shrink-0 px-2 text-[10px]" : "h-8 shrink-0 text-xs"
              )}
              onClick={isAssignedToMe ? onUnassign : onAssignToMe}
            >
              <User className={cn(compact ? "mr-1 h-2.5 w-2.5" : "mr-1.5 h-3 w-3")} />
              {isAssignedToMe ? "Unassign" : "Assign"}
            </Button>
          </div>
        ) : null}

        <div className={cn(compact ? "space-y-1.5" : "space-y-2.5")}>
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
                dense={compact}
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
                dense={compact}
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
              dense={compact}
              value={contact.hasAgent ? "Yes" : "No"}
            />
          ) : null}
          {contact.timeline ? (
            <InfoRow label="Timeline" dense={compact} value={contact.timeline} />
          ) : null}
        </div>

        {hasCrmAccess ? (
          <div
            className={cn(
              compact ? "pt-2.5" : "pt-4",
              rail ? "border-t border-kp-outline/50" : "border-t border-kp-outline"
            )}
          >
            <div className={cn("flex items-center gap-1.5", compact ? "mb-1.5" : "mb-3")}>
              <Tag
                className={cn(
                  "text-kp-on-surface-variant/80",
                  compact ? "h-3 w-3" : "h-3.5 w-3.5"
                )}
              />
              <span
                className={cn(
                  "font-medium text-kp-on-surface",
                  compact ? "text-[10px] uppercase tracking-wide" : "text-xs font-semibold"
                )}
              >
                Tags
              </span>
            </div>
            {tags.length > 0 ? (
              <div className={cn("flex flex-wrap", compact ? "mb-2 gap-1" : "mb-3 gap-1.5")}>
                {tags.map((ct) => (
                  <span
                    key={ct.tag.id}
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full font-normal text-kp-teal/90",
                      compact
                        ? "bg-kp-teal/[0.08] px-2 py-0.5 text-[10px]"
                        : "bg-kp-teal/15 px-2.5 py-0.5 text-xs font-medium"
                    )}
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
            <div className="flex gap-1.5">
              <Input
                placeholder="Add tag…"
                value={tagName}
                onChange={(e) => onTagNameChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAddTag()}
                className={cn(
                  "flex-1 border-kp-outline bg-kp-surface-high text-kp-on-surface placeholder:text-kp-on-surface-variant focus-visible:ring-kp-teal",
                  compact ? "h-7 text-[11px]" : "h-8 text-sm"
                )}
              />
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  kpBtnPrimary,
                  compact
                    ? "h-7 border-transparent px-2 text-[10px]"
                    : "h-8 border-transparent px-3 text-xs"
                )}
                onClick={onAddTag}
                disabled={!tagName.trim() || addingTag}
              >
                {addingTag ? "…" : "Add"}
              </Button>
            </div>
          </div>
        ) : null}
    </div>
  );

  if (rail) {
    return (
      <div className={cn("border-t border-kp-outline/50", railCompact ? "pt-2" : "pt-3")}>
        <p
          className={cn(
            "font-medium uppercase tracking-wide text-kp-on-surface-variant/90",
            railCompact ? "mb-1.5 text-[9px]" : "mb-2 text-[10px] font-semibold"
          )}
        >
          Contact details
        </p>
        {inner}
      </div>
    );
  }

  return (
    <ContactDetailSection
      title="Contact"
      description={`Source · ${contact.source}`}
    >
      {inner}
    </ContactDetailSection>
  );
}

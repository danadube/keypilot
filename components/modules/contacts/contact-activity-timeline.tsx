"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { kpBtnPrimary } from "@/components/ui/kp-dashboard-button-tiers";
import { FileText, GitBranch } from "lucide-react";
import { ContactDetailSection } from "./contact-detail-section";
import type { ContactDetailActivity } from "./contact-detail-types";
import {
  contactActivityLabel,
  formatContactDateTime,
} from "./contact-detail-utils";

type ContactActivityTimelineProps = {
  activities: ContactDetailActivity[];
  hasCrmAccess: boolean;
  noteBody: string;
  addingNote: boolean;
  onNoteBodyChange: (v: string) => void;
  onAddNote: () => void;
  /** Primary workspace: lighter chrome, timeline-first. */
  workspace?: boolean;
};

export function ContactActivityTimeline({
  activities,
  hasCrmAccess,
  noteBody,
  addingNote,
  onNoteBodyChange,
  onAddNote,
  workspace = false,
}: ContactActivityTimelineProps) {
  return (
    <ContactDetailSection
      title="Activity"
      description="Chronological timeline — newest first. Use Actions for calls, emails, tasks, and follow-ups."
      icon={<GitBranch className="h-3.5 w-3.5" />}
      className={cn(
        "min-h-[240px] border-kp-outline/50 bg-kp-surface/40",
        workspace && "border-kp-outline/40"
      )}
    >
      {hasCrmAccess ? (
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end">
          <Textarea
            id="contact-activity-note"
            placeholder="Quick note…"
            value={noteBody}
            onChange={(e) => onNoteBodyChange(e.target.value)}
            rows={2}
            className="min-h-0 flex-1 resize-none border-kp-outline/70 bg-kp-surface text-sm text-kp-on-surface placeholder:text-kp-on-surface-variant focus-visible:ring-kp-teal"
          />
          <Button
            variant="outline"
            size="sm"
            className={cn(kpBtnPrimary, "h-9 shrink-0 border-transparent px-4 text-xs sm:self-end")}
            onClick={onAddNote}
            disabled={!noteBody.trim() || addingNote}
          >
            {addingNote ? "Adding…" : "Add note"}
          </Button>
        </div>
      ) : (
        <p className="mb-5 text-sm text-kp-on-surface-variant">
          <FileText className="mb-1 mr-1 inline h-4 w-4 align-text-bottom opacity-70" />
          Timeline is read-only. Full CRM unlocks notes and richer history.
        </p>
      )}

      {activities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-kp-outline/60 py-10 text-center">
          <p className="text-sm text-kp-on-surface-variant">
            No timeline events yet. Notes appear here; use Actions to log calls, emails, and more.
          </p>
        </div>
      ) : (
        <ul className="space-y-0">
          {activities.map((a) => {
            const { label, colorClass } =
              a.activityType === "NOTE_ADDED" && a.body.startsWith("Record updated:")
                ? { label: "Record update", colorClass: "text-kp-on-surface-variant" }
                : contactActivityLabel(a.activityType);
            return (
              <li
                key={a.id}
                className={cn(
                  "border-b border-kp-outline/40 py-3.5 last:border-b-0",
                  "flex flex-col gap-1.5 sm:grid sm:grid-cols-[88px_16px_minmax(0,1fr)] sm:items-stretch sm:gap-x-0 sm:gap-y-0"
                )}
              >
                <time
                  dateTime={a.occurredAt}
                  className="w-full shrink-0 text-xs tabular-nums text-kp-on-surface-variant sm:w-[88px] sm:max-w-[88px] sm:pt-0.5"
                >
                  {formatContactDateTime(a.occurredAt)}
                </time>
                {/* Rail: dedicated middle column (desktop); line only here, not on content */}
                <div
                  className="hidden min-h-0 w-[16px] shrink-0 flex-col items-center self-stretch sm:flex"
                  aria-hidden
                >
                  <div className="w-px flex-1 bg-kp-outline/50" />
                </div>
                <div className="min-w-0">
                  <span
                    className={cn(
                      "mb-0.5 block text-[10px] font-semibold uppercase tracking-wide",
                      colorClass
                    )}
                  >
                    {label}
                  </span>
                  <p className="break-words text-sm leading-snug text-kp-on-surface">{a.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ContactDetailSection>
  );
}

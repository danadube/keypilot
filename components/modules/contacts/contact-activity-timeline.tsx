"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { kpBtnPrimary } from "@/components/ui/kp-dashboard-button-tiers";
import { FileText, GitBranch } from "lucide-react";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { ContactDetailSection } from "./contact-detail-section";
import type { ContactDetailActivity } from "./contact-detail-types";

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
  const items = activities.map((a) => ({
    id: a.id,
    activityType: a.activityType,
    body: a.body,
    occurredAt: a.occurredAt,
  }));

  const inlineNote = hasCrmAccess ? (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
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
    <p className="text-sm text-kp-on-surface-variant">
      <FileText className="mb-1 mr-1 inline h-4 w-4 align-text-bottom opacity-70" />
      Timeline is read-only. Full CRM unlocks notes and richer history.
    </p>
  );

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
      <ActivityTimeline
        items={items}
        showTypeLabel
        allowInlineNote
        inlineNote={inlineNote}
        emptyState={
          <div className="rounded-lg border border-dashed border-kp-outline/60 py-10 text-center">
            <p className="text-sm text-kp-on-surface-variant">
              No timeline events yet. Notes appear here; use Actions to log calls, emails, and more.
            </p>
          </div>
        }
      />
    </ContactDetailSection>
  );
}

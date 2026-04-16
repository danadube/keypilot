"use client";

import { useCallback, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { kpBtnPrimary } from "@/components/ui/kp-dashboard-button-tiers";
import { FileText, GitBranch } from "lucide-react";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { ContactDetailSection } from "./contact-detail-section";
import type { ContactDetailActivity } from "./contact-detail-types";

type ContactActivityTimelineProps = {
  /** Anchor for in-page navigation (e.g. workbench strip). */
  sectionId?: string;
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
  sectionId = "contact-activity-stream",
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

  const canSave = noteBody.trim().length > 0 && !addingNote;

  const handleNoteKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Enter" || (!e.metaKey && !e.ctrlKey)) return;
      if (!canSave) return;
      e.preventDefault();
      onAddNote();
    },
    [canSave, onAddNote]
  );

  const quickNote = hasCrmAccess ? (
    <div
      className={cn(
        "rounded-lg border border-kp-outline/35 bg-kp-surface-high/[0.12] p-3",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
      )}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
        <span className="text-xs font-medium text-kp-on-surface">Quick note</span>
        <span className="text-[10px] tabular-nums text-kp-on-surface-variant">
          ⌘↵ or Ctrl+Enter to save
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Textarea
          id="contact-activity-note"
          name="contact-quick-note"
          placeholder="Type and save — no extra fields."
          value={noteBody}
          onChange={(e) => onNoteBodyChange(e.target.value)}
          onKeyDown={handleNoteKeyDown}
          rows={2}
          className="min-h-0 flex-1 resize-y border-kp-outline/50 bg-kp-surface/80 text-sm text-kp-on-surface placeholder:text-kp-on-surface-variant/80 focus-visible:border-kp-teal/60 focus-visible:ring-kp-teal"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            kpBtnPrimary,
            "h-9 shrink-0 border-transparent px-4 text-xs sm:self-end",
            !canSave && "opacity-60"
          )}
          onClick={onAddNote}
          disabled={!canSave}
        >
          {addingNote ? "Saving…" : "Save"}
        </Button>
      </div>
      <p className="mt-2.5 text-[11px] leading-snug text-kp-on-surface-variant">
        <span className="text-kp-on-surface-variant/90">Structured touchpoints</span>
        {" — "}
        use <span className="font-medium text-kp-on-surface">Actions</span> for call, email, or a dated
        follow-up.
      </p>
    </div>
  ) : (
    <p className="text-sm text-kp-on-surface-variant">
      <FileText className="mb-1 mr-1 inline h-4 w-4 align-text-bottom opacity-70" />
      Timeline is read-only. Full CRM unlocks notes and richer history.
    </p>
  );

  return (
    <ContactDetailSection
      id={sectionId}
      title="Activity"
      description="Jot a note below, or open Actions for calls, email, and follow-ups."
      icon={<GitBranch className="h-3.5 w-3.5" />}
      className={cn(
        "min-h-[200px] border-kp-outline/45 bg-kp-surface/35",
        workspace && "border-kp-outline/35"
      )}
    >
      {quickNote}

      <div className={cn("mt-5", !hasCrmAccess && "mt-0")}>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-kp-on-surface-variant">
            Timeline
          </h3>
          {items.length > 0 ? (
            <span className="text-[10px] text-kp-on-surface-variant">Newest first</span>
          ) : null}
        </div>
        <ActivityTimeline
          items={items}
          showTypeLabel
          emptyState={
            <div className="rounded-lg border border-dashed border-kp-outline/50 bg-kp-surface-high/[0.06] py-8 text-center px-3">
              <p className="text-sm text-kp-on-surface-variant">
                Nothing logged yet. Add a quick note above, or use{" "}
                <span className="font-medium text-kp-on-surface">Actions</span> for calls and email.
              </p>
            </div>
          }
        />
      </div>
    </ContactDetailSection>
  );
}

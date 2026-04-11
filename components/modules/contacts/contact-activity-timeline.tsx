"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  kpBtnPrimary,
  kpBtnSecondary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { FileText, MessageSquare, GitBranch } from "lucide-react";
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
  commChannel: "CALL" | "EMAIL";
  onCommChannelChange: (v: "CALL" | "EMAIL") => void;
  commBody: string;
  onCommBodyChange: (v: string) => void;
  loggingComm: boolean;
  onLogCommunication: () => void;
  /** Primary workspace layout: larger compose surface, stronger hierarchy. */
  workspace?: boolean;
};

export function ContactActivityTimeline({
  activities,
  hasCrmAccess,
  noteBody,
  addingNote,
  onNoteBodyChange,
  onAddNote,
  commChannel,
  onCommChannelChange,
  commBody,
  onCommBodyChange,
  loggingComm,
  onLogCommunication,
  workspace = false,
}: ContactActivityTimelineProps) {
  return (
    <ContactDetailSection
      title="Activity"
      description={
        workspace
          ? "Log notes and touches, then scan the timeline — newest first."
          : "Everything that happened with this contact — newest first."
      }
      icon={<GitBranch className="h-3.5 w-3.5" />}
      className={cn(
        "min-h-[280px]",
        workspace && "border-kp-teal/15 bg-kp-surface-high/20"
      )}
    >
      {hasCrmAccess ? (
        <div className={cn("mb-5 space-y-3", workspace && "mb-6")}>
          <div
            className={cn(
              "space-y-2 rounded-lg border p-3",
              workspace
                ? "border-kp-teal/25 bg-kp-surface/80"
                : "border-kp-outline bg-kp-surface-high/50"
            )}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-kp-on-surface-variant" />
              <span className="text-xs font-medium text-kp-on-surface">
                Add note
              </span>
            </div>
            <Textarea
              id="contact-activity-note"
              placeholder="Capture what matters while it is fresh..."
              value={noteBody}
              onChange={(e) => onNoteBodyChange(e.target.value)}
              rows={workspace ? 4 : 2}
              className="resize-none border-kp-outline bg-kp-surface text-sm text-kp-on-surface placeholder:text-kp-on-surface-variant focus-visible:ring-kp-teal"
            />
            <Button
              variant="outline"
              size="sm"
              className={cn(kpBtnPrimary, "h-7 border-transparent px-3 text-xs")}
              onClick={onAddNote}
              disabled={!noteBody.trim() || addingNote}
            >
              {addingNote ? "Adding…" : "Add note"}
            </Button>
          </div>

          <details className="group rounded-lg border border-kp-outline bg-kp-surface-high/30">
            <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-medium text-kp-on-surface outline-none marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-kp-on-surface-variant" />
                Log a call or email
                <span className="text-kp-on-surface-variant font-normal">
                  (optional)
                </span>
              </span>
            </summary>
            <div className="space-y-2 border-t border-kp-outline p-3 pt-3">
              <Select
                value={commChannel}
                onValueChange={(v) =>
                  onCommChannelChange(v as "CALL" | "EMAIL")
                }
              >
                <SelectTrigger className="h-7 w-28 border-kp-outline bg-kp-surface text-xs text-kp-on-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-kp-outline bg-kp-surface text-kp-on-surface">
                  <SelectItem value="CALL">Call</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder={`What was discussed…`}
                value={commBody}
                onChange={(e) => onCommBodyChange(e.target.value)}
                rows={2}
                className="resize-none border-kp-outline bg-kp-surface text-sm text-kp-on-surface placeholder:text-kp-on-surface-variant focus-visible:ring-kp-teal"
              />
              <Button
                size="sm"
                variant="outline"
                className={cn(kpBtnSecondary, "h-7 px-3 text-xs")}
                onClick={onLogCommunication}
                disabled={!commBody.trim() || loggingComm}
              >
                {loggingComm ? "Logging…" : `Log ${commChannel.toLowerCase()}`}
              </Button>
            </div>
          </details>
        </div>
      ) : null}

      {activities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-kp-outline py-12 text-center">
          <p className="text-sm text-kp-on-surface-variant">
            No activity yet. Notes and logged touches will build the timeline here.
          </p>
        </div>
      ) : (
        <ul className="relative space-y-0">
          <span
            className="pointer-events-none absolute left-[5.25rem] top-2 bottom-2 w-px bg-kp-outline/90 hidden sm:block"
            aria-hidden
          />
          {activities.map((a, i) => {
            const { label, colorClass } = contactActivityLabel(a.activityType);
            return (
              <li
                key={a.id}
                className={cn(
                  "relative flex flex-col gap-1 py-4 sm:flex-row sm:items-start sm:gap-4",
                  i < activities.length - 1 && "border-b border-kp-outline"
                )}
              >
                <time
                  dateTime={a.occurredAt}
                  className="shrink-0 text-xs tabular-nums text-kp-on-surface-variant sm:w-28 sm:pt-0.5"
                >
                  {formatContactDateTime(a.occurredAt)}
                </time>
                <div className="min-w-0 flex-1 sm:pl-2">
                  <span
                    className={cn(
                      "mb-1 block text-[10px] font-bold uppercase tracking-wide",
                      colorClass
                    )}
                  >
                    {label}
                  </span>
                  <p className="text-sm leading-snug text-kp-on-surface">
                    {a.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ContactDetailSection>
  );
}

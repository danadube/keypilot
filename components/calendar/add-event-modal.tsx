"use client";

import type { ReactNode } from "react";
import { CalendarClock, CheckSquare, UserRound } from "lucide-react";
import Link from "next/link";
import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";

/**
 * Prefill from a calendar click (week slot, all-day row, or month day).
 * - `time` empty string = date-only / all-day context (tasks: due date without time).
 * - `time` `"09:00"` etc. = snapped or default clock time.
 */
export type CalendarQuickAddPrefill = {
  date: string;
  time: string;
};

/** Reserved for future options: Meeting, External event, Open house, etc. */
export const CALENDAR_ADD_EVENT_FUTURE_KINDS = [
  "meeting",
  "external_event",
  "open_house",
] as const;

function parseYmdLocal(ymd: string): Date | null {
  const m = ymd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function formatCalendarQuickAddSummary(prefill: CalendarQuickAddPrefill): string {
  const dt = parseYmdLocal(prefill.date);
  const datePart = dt
    ? dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    : prefill.date;
  const t = prefill.time.trim();
  if (!t) return `${datePart} · No set time`;
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const mi = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(mi)) return `${datePart} · ${t}`;
  const clock = new Date(2000, 0, 1, h, mi, 0, 0).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} · ${clock}`;
}

type ChoiceCardProps = {
  icon: ReactNode;
  label: string;
  description: string;
  onClick: () => void;
};

function ChoiceCard({ icon, label, description, onClick }: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border border-kp-outline/70 bg-kp-surface-high/[0.06] px-3 py-2.5 text-left transition-colors",
        "hover:border-kp-teal/40 hover:bg-kp-teal/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-teal/50"
      )}
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-kp-bg/90 text-kp-teal">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-kp-on-surface">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-kp-on-surface-muted">{description}</span>
      </span>
    </button>
  );
}

export type AddEventModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill: CalendarQuickAddPrefill | null;
  onChooseShowing: (prefill: CalendarQuickAddPrefill) => void;
  onChooseTask: (prefill: CalendarQuickAddPrefill) => void;
  onChooseFollowUp: (prefill: CalendarQuickAddPrefill) => void;
};

export function AddEventModal({
  open,
  onOpenChange,
  prefill,
  onChooseShowing,
  onChooseTask,
  onChooseFollowUp,
}: AddEventModalProps) {
  const summary = prefill ? formatCalendarQuickAddSummary(prefill) : "";

  return (
    <BrandModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add to Calendar"
      description={summary ? summary : "Choose what to add"}
      size="sm"
      bodyClassName="space-y-2.5 pt-1"
      footer={
        <Button type="button" variant="outline" size="sm" className={kpBtnSecondary} onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        <ChoiceCard
          icon={<CalendarClock className="h-4 w-4" aria-hidden />}
          label="Showing"
          description="Private appointment on ShowingHQ"
          onClick={() => {
            if (!prefill) return;
            onChooseShowing(prefill);
          }}
        />
        <ChoiceCard
          icon={<CheckSquare className="h-4 w-4" aria-hidden />}
          label="Task"
          description="Task Pilot item with due date"
          onClick={() => {
            if (!prefill) return;
            onChooseTask(prefill);
          }}
        />
        <ChoiceCard
          icon={<UserRound className="h-4 w-4" aria-hidden />}
          label="Follow-up"
          description="Contact-driven follow-up work"
          onClick={() => {
            if (!prefill) return;
            onChooseFollowUp(prefill);
          }}
        />
      </div>
    </BrandModal>
  );
}

export type FollowUpCalendarHintModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillSummary: string;
};

/** Lightweight pointer — full “create follow-up from slot” can ship later. */
export function FollowUpCalendarHintModal({
  open,
  onOpenChange,
  prefillSummary,
}: FollowUpCalendarHintModalProps) {
  return (
    <BrandModal
      open={open}
      onOpenChange={onOpenChange}
      title="Schedule a follow-up"
      description={prefillSummary ? `Slot: ${prefillSummary}` : undefined}
      size="sm"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" size="sm" className={kpBtnSecondary} onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button size="sm" className="min-w-[7rem]" asChild>
            <Link href="/contacts" onClick={() => onOpenChange(false)}>
              Open contacts
            </Link>
          </Button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-kp-on-surface">
        Follow-ups are created from a contact or visitor context. Use{" "}
        <Link href="/showing-hq/follow-ups" className="font-medium text-kp-teal hover:underline" onClick={() => onOpenChange(false)}>
          ShowingHQ follow-ups
        </Link>{" "}
        to work your queue, or open a contact to schedule from{" "}
        <span className="font-medium text-kp-on-surface">Actions → Schedule follow-up</span>.
      </p>
    </BrandModal>
  );
}

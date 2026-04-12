import { cn } from "@/lib/utils";

/** Priority task / generic source tags */
export type CommandCenterSourceTag = "TXN" | "CRM" | "MKT" | "SHQ" | "CAL";

const SOURCE_BASE =
  "inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide";

export function commandCenterSourceChipClass(tag: CommandCenterSourceTag): string {
  switch (tag) {
    case "TXN":
      return cn(SOURCE_BASE, "border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-100");
    case "CRM":
      return cn(SOURCE_BASE, "border-teal-500/35 bg-teal-500/10 text-teal-900 dark:text-teal-100");
    case "MKT":
      return cn(SOURCE_BASE, "border-violet-500/35 bg-violet-500/10 text-violet-900 dark:text-violet-100");
    case "SHQ":
      return cn(SOURCE_BASE, "border-sky-500/35 bg-sky-500/10 text-sky-900 dark:text-sky-100");
    case "CAL":
      return cn(SOURCE_BASE, "border-emerald-500/35 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100");
    default:
      return cn(SOURCE_BASE, "border-kp-outline/60 bg-kp-surface-high/30 text-kp-on-surface-muted");
  }
}

export type ListingStageChip = "ACTIVE" | "PENDING" | "CLOSING" | "DRAFT" | "COMING_SOON";

const STAGE_BASE = "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold";

export function listingStageChipClass(stage: ListingStageChip): string {
  switch (stage) {
    case "ACTIVE":
      return cn(STAGE_BASE, "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100");
    case "PENDING":
      return cn(STAGE_BASE, "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100");
    case "CLOSING":
      return cn(STAGE_BASE, "border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-100");
    case "DRAFT":
      return cn(STAGE_BASE, "border-kp-outline/50 bg-kp-surface-high/40 text-kp-on-surface-variant");
    case "COMING_SOON":
      return cn(STAGE_BASE, "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-100");
    default:
      return cn(STAGE_BASE, "border-kp-outline/50 bg-kp-surface-high/30 text-kp-on-surface-muted");
  }
}

/** Schedule row kind → scan chip (lightweight). */
export function scheduleKindSourceTag(kind: "SHOWING" | "FOLLOW_UP" | "TASK" | "CHECKLIST"): CommandCenterSourceTag {
  switch (kind) {
    case "SHOWING":
      return "SHQ";
    case "FOLLOW_UP":
      return "CRM";
    case "TASK":
      return "MKT";
    case "CHECKLIST":
      return "TXN";
    default:
      return "CRM";
  }
}

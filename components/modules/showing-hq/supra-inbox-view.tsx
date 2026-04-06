"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent } from "react";
import type {
  SupraQueueItem,
  SupraQueueState,
  SupraParseConfidence,
  SupraProposedAction,
  SupraPropertyMatchStatus,
  SupraShowingMatchStatus,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BrandModal } from "@/components/ui/BrandModal";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import {
  SupraInboxQueueRow,
  isLinkedEndOfShowingQueueRow,
} from "@/components/modules/showing-hq/supra-inbox-queue-row";
import {
  supraBtnDangerSecondary,
  supraBtnPrimary,
  supraBtnSave,
  supraBtnSecondary,
  supraBtnTertiary,
} from "@/components/modules/showing-hq/supra-inbox-button-tiers";
import { cn } from "@/lib/utils";
import { UI_COPY } from "@/lib/ui-copy";
import { toast } from "sonner";
import {
  pastedBlobHasDetectedFields,
  splitPastedEmailBlob,
} from "@/lib/manual-ingest/split-pasted-email-blob";
import type { SplitPastedEmailBlobDetected } from "@/lib/manual-ingest/split-pasted-email-blob";
import {
  SupraQueueState as QueueStates,
  SupraParseConfidence as Confidences,
  SupraProposedAction as ProposedActions,
  SupraPropertyMatchStatus as PropMatch,
  SupraShowingMatchStatus as ShowMatch,
} from "@prisma/client";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Inbox,
  ChevronDown,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  defaultSupraGmailImportStatus,
  formatSupraGmailImportResultSummary,
  relTimeShort,
  type SupraGmailImportStatus,
} from "@/lib/showing-hq/supra-gmail-import-status";

/** Local value for `<input type="datetime-local" />` */
function dateToDatetimeLocalInputValue(d: Date): string {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
}

function formatEnumLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

/** Human-readable proposed actions (review modal + selects) */
const PROPOSED_ACTION_LABELS: Record<SupraProposedAction, string> = {
  UNKNOWN: "Choose action",
  CREATE_SHOWING: "Create showing",
  UPDATE_SHOWING: "Update or complete showing",
  CREATE_PROPERTY_AND_SHOWING: "Create property + showing",
  DISMISS: "Dismiss",
  NEEDS_MANUAL_REVIEW: "Needs review",
};

const CONFIDENCE_HINTS: Record<SupraParseConfidence, string> = {
  HIGH: "Parser (when connected) would be very confident in these fields.",
  MEDIUM: "Reasonable guess — verify address and time before applying.",
  LOW: "Treat as draft — most fields need human correction.",
};

const TERMINAL_STATES: SupraQueueState[] = [
  QueueStates.DISMISSED,
  QueueStates.DUPLICATE,
  QueueStates.APPLIED,
  QueueStates.FAILED_PARSE,
];

function isAwaitingDecision(state: SupraQueueState): boolean {
  return (
    state === QueueStates.NEEDS_REVIEW ||
    state === QueueStates.INGESTED ||
    state === QueueStates.PARSED ||
    state === QueueStates.READY_TO_APPLY
  );
}

function queueStateBadgeVariant(
  state: SupraQueueState
): React.ComponentProps<typeof StatusBadge>["variant"] {
  switch (state) {
    case QueueStates.NEEDS_REVIEW:
    case QueueStates.READY_TO_APPLY:
      return "pending";
    case QueueStates.APPLIED:
    case QueueStates.PARSED:
      return "sold";
    case QueueStates.DISMISSED:
    case QueueStates.DUPLICATE:
      return "inactive";
    case QueueStates.FAILED_PARSE:
      return "cancelled";
    default:
      return "draft";
  }
}

function confidenceBadgeVariant(
  c: SupraParseConfidence
): React.ComponentProps<typeof StatusBadge>["variant"] {
  switch (c) {
    case Confidences.HIGH:
      return "sold";
    case Confidences.MEDIUM:
      return "pending";
    default:
      return "inactive";
  }
}

/** Inputs/selects: obvious editable fields (review + paste modals). */
const fieldInput =
  "h-9 w-full rounded-md border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-teal focus-visible:border-kp-teal disabled:cursor-not-allowed disabled:opacity-60";

const fieldTextarea =
  "min-h-[72px] w-full rounded-md border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-teal focus-visible:border-kp-teal";

const reviewFormLabel = "text-xs font-medium text-kp-on-surface uppercase tracking-wide";

const reviewSectionTitle = "text-sm font-semibold text-kp-on-surface";

/** Preview + expanded editor share the same surface/typography. */
const reviewRawBodyChrome =
  "w-full rounded-md border border-kp-outline/95 bg-kp-bg p-3 font-mono text-[13px] leading-snug text-kp-on-surface shadow-sm";

const reviewRawBodyTextarea = cn(
  reviewRawBodyChrome,
  "min-h-[160px] placeholder:text-kp-on-surface-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-teal focus-visible:border-kp-teal"
);

/** Left column workflow rail (review modal). */
const reviewWorkflowRail =
  "text-xs font-semibold uppercase tracking-wide text-kp-chart-teal";

/** Right rail of review modal — hierarchy + contrast (see docs/ui/supra-ui-rules.md). */
const reviewRightRailIntro =
  "text-[11px] font-semibold uppercase tracking-wide text-kp-chart-teal";

const reviewRightRailStep =
  "text-[11px] font-bold uppercase tracking-[0.06em] text-kp-chart-teal";

const reviewRightFieldLabel =
  "text-[11px] font-bold uppercase tracking-wide text-kp-on-surface/95";

const reviewRightInstruction =
  "text-sm font-medium leading-relaxed text-kp-on-surface";

const reviewRightHelper =
  "text-xs leading-relaxed text-kp-on-surface/90";

const reviewRightGuidance =
  "text-xs leading-relaxed text-kp-on-surface/90";

const reviewRightCodeMeta =
  "mt-1 font-mono text-[11px] leading-snug text-kp-on-surface/92";

const reviewRightFormLabel =
  "text-xs font-semibold text-kp-on-surface/95 uppercase tracking-wide";

const reviewRightPanel =
  "rounded-lg border border-kp-outline bg-kp-surface-high/75 p-3 shadow-md ring-1 ring-white/[0.09]";

const reviewRightApplyShell =
  "rounded-lg border-2 border-kp-teal/65 bg-kp-teal/[0.18] p-3 shadow-md ring-2 ring-kp-teal/30";

const reviewRightSuggestPanel =
  "mb-2 rounded-lg border border-kp-outline bg-kp-surface-high/60 p-2";

const reviewRightAdvancedIntro =
  "text-[11px] leading-relaxed text-kp-on-surface/90";

const reviewRightAdvancedLabel =
  "text-[12px] font-semibold uppercase tracking-wide text-kp-on-surface/95";

/** Review queue modal only — does not alter main inbox / paste sheet typography. */
const reviewModalBannerBody = "text-sm leading-snug text-kp-on-surface/92";
const reviewModalFooterEyebrow =
  "text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface/92";
const reviewModalFieldHint = "text-[11px] leading-snug text-kp-on-surface/88";

/** Work-queue typography: strong primary, readable secondary, metadata still legible on dark surfaces. */
const t = {
  label: "text-sm font-medium text-kp-on-surface",
  section: "text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface/92",
  body: "text-sm leading-snug text-kp-on-surface",
  meta: "text-xs leading-snug text-kp-on-surface/88",
  metaQuiet: "text-[11px] leading-snug text-kp-on-surface/88",
} as const;

function rawBodyLines(text: string): string[] {
  if (!text) return [];
  return text.split(/\r?\n/);
}

type ItemWithRelations = SupraQueueItem & {
  matchedProperty: {
    id: string;
    address1: string;
    city: string;
    state: string;
    zip?: string;
  } | null;
  matchedShowing: { id: string; scheduledAt: Date; propertyId: string } | null;
};

type PropertySuggestionRow = {
  id: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  matchKind: "exact" | "partial_zip" | "partial";
};

type ShowingSuggestionRow = {
  id: string;
  scheduledAt: string;
  minutesDelta: number;
  propertyId: string;
  property: { id: string; address1: string; city: string; state: string; zip: string };
};

/** Conservative candidate properties for showing lookup before the reviewer picks one. */
function candidatePropertyIdsForShowingSuggest(suggestions: PropertySuggestionRow[]): string[] {
  const uniq = (ids: string[]) => Array.from(new Set(ids));
  const exactIds = suggestions.filter((s) => s.matchKind === "exact").map((s) => s.id);
  if (exactIds.length > 0) return uniq(exactIds).slice(0, 5);
  const zipIds = suggestions.filter((s) => s.matchKind === "partial_zip").map((s) => s.id);
  if (zipIds.length > 0) return uniq(zipIds).slice(0, 5);
  return uniq(suggestions.map((s) => s.id)).slice(0, 3);
}

function propertyMatchKindLabel(kind: PropertySuggestionRow["matchKind"]): string {
  if (kind === "exact") return "Exact";
  if (kind === "partial_zip") return "Partial · ZIP";
  return "Partial";
}

type ApplyDuplicateProperty = {
  id: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
};

type ApplyDuplicateBundle = {
  conflicts: {
    id: string;
    scheduledAt: string;
    minutesFromParsed: number;
    property?: ApplyDuplicateProperty;
  }[];
  context: {
    windowHours: number;
    parsedScheduledAt: string;
    isUpdatingMatchedShowing: boolean;
    matchedShowingId: string | null;
    property: ApplyDuplicateProperty | null;
  };
  /** Full server explanation (API error.message) */
  serverGuidance?: string;
};

/** Build structured duplicate state from POST apply 409 (supports older responses without duplicateContext). */
function parseApplyDuplicate409(
  json: Record<string, unknown>,
  detail: ItemWithRelations
): ApplyDuplicateBundle | null {
  if (!detail.parsedScheduledAt) return null;
  const rawList = json.conflicts;
  if (!Array.isArray(rawList) || rawList.length === 0) return null;

  const parsedAtMs = new Date(detail.parsedScheduledAt).getTime();
  const conflicts = rawList.map((raw: unknown) => {
    const c = raw as Record<string, unknown>;
    const id = typeof c.id === "string" ? c.id : "";
    const scheduledAt = typeof c.scheduledAt === "string" ? c.scheduledAt : "";
    const minutesFromParsed =
      typeof c.minutesFromParsed === "number"
        ? c.minutesFromParsed
        : Math.round(Math.abs(new Date(scheduledAt).getTime() - parsedAtMs) / 60000);
    let property: ApplyDuplicateProperty | undefined;
    const p = c.property;
    if (p && typeof p === "object" && p !== null) {
      const o = p as Record<string, unknown>;
      if (typeof o.id === "string" && typeof o.address1 === "string") {
        property = {
          id: o.id,
          address1: o.address1,
          city: String(o.city ?? ""),
          state: String(o.state ?? ""),
          zip: String(o.zip ?? ""),
        };
      }
    }
    return { id, scheduledAt, minutesFromParsed, property };
  });

  const ctxRaw = json.duplicateContext as Record<string, unknown> | undefined;
  let property: ApplyDuplicateProperty | null = null;
  if (ctxRaw?.property && typeof ctxRaw.property === "object" && ctxRaw.property !== null) {
    const o = ctxRaw.property as Record<string, unknown>;
    if (typeof o.id === "string" && typeof o.address1 === "string") {
      property = {
        id: o.id,
        address1: o.address1,
        city: String(o.city ?? ""),
        state: String(o.state ?? ""),
        zip: String(o.zip ?? ""),
      };
    }
  }
  if (!property && detail.matchedProperty) {
    const mp = detail.matchedProperty;
    property = {
      id: mp.id,
      address1: mp.address1,
      city: mp.city,
      state: mp.state,
      zip: mp.zip ?? "",
    };
  }

  const err = json.error as { message?: string } | undefined;
  const serverGuidance = typeof err?.message === "string" ? err.message : undefined;

  return {
    conflicts,
    context: {
      windowHours: typeof ctxRaw?.windowHours === "number" ? ctxRaw.windowHours : 2,
      parsedScheduledAt:
        typeof ctxRaw?.parsedScheduledAt === "string"
          ? ctxRaw.parsedScheduledAt
          : new Date(detail.parsedScheduledAt).toISOString(),
      isUpdatingMatchedShowing: ctxRaw?.isUpdatingMatchedShowing === true,
      matchedShowingId: typeof ctxRaw?.matchedShowingId === "string" ? ctxRaw.matchedShowingId : null,
      property,
    },
    serverGuidance,
  };
}

/**
 * Client Apply readiness — aligned with POST …/supra-queue/[id]/apply:
 * - parsedScheduledAt required
 * - matched property OR full parsed address (line1, city, state, ZIP)
 * Server does not use parse confidence; we do not block LOW here if address/property is grounded.
 */
function getApplyReadiness(detail: ItemWithRelations | null): { ok: boolean; reasons: string[] } {
  if (!detail) return { ok: false, reasons: [] };
  if (TERMINAL_STATES.includes(detail.queueState)) {
    return { ok: false, reasons: [] };
  }
  /** End-of-showing is automated — never blocks or surfaces as “apply” work. */
  if (detail.parsedStatus === "showing_ended") {
    return { ok: false, reasons: [] };
  }
  const reasons: string[] = [];
  if (!detail.parsedScheduledAt) {
    reasons.push("Set parsed scheduled date and time.");
  }
  const hasProp = Boolean(detail.matchedPropertyId?.trim());
  const hasAddr = Boolean(
    detail.parsedAddress1?.trim() &&
      detail.parsedCity?.trim() &&
      detail.parsedState?.trim() &&
      detail.parsedZip?.trim()
  );
  if (!hasProp && !hasAddr) {
    reasons.push("Link a matched property or fill address, city, state, and ZIP.");
  }
  return { ok: reasons.length === 0, reasons };
}

type FilterPreset =
  | "active"
  | "all"
  | "ingested"
  | "needs_review"
  | "ready_to_apply"
  | "failed_parse"
  | "closed";

function isTerminalInboxState(s: SupraQueueState): boolean {
  return (
    s === QueueStates.APPLIED ||
    s === QueueStates.DISMISSED ||
    s === QueueStates.DUPLICATE
  );
}

/** Default “Needs attention” hides end-of-showing traffic (handled in background). */
function isHiddenFromNeedsAttentionFilter(row: ItemWithRelations): boolean {
  return row.parsedStatus === "showing_ended";
}

function normalizeItem(row: ItemWithRelations): ItemWithRelations {
  return {
    ...row,
    receivedAt: new Date(row.receivedAt),
    parsedScheduledAt: row.parsedScheduledAt ? new Date(row.parsedScheduledAt) : null,
    parsedShowingBeganAt: row.parsedShowingBeganAt ? new Date(row.parsedShowingBeganAt) : null,
    reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : null,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    matchedShowing: row.matchedShowing
      ? {
          ...row.matchedShowing,
          scheduledAt: new Date(row.matchedShowing.scheduledAt),
        }
      : null,
  };
}

type SupraInboxSuccessInfo = {
  message: string;
  /** Set when apply API saved a buyer-agent feedback draft */
  buyerAgentFeedbackDraftReady?: boolean;
  /** Showing id from apply response — deep-link to Showings edit when draft is ready */
  applyShowingId?: string;
};

export function SupraInboxView() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ItemWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<SupraInboxSuccessInfo | null>(null);
  const [filterPreset, setFilterPreset] = useState<FilterPreset>("active");
  const [detail, setDetail] = useState<ItemWithRelations | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [sampleMenuOpen, setSampleMenuOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyingRowId, setApplyingRowId] = useState<string | null>(null);
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
  const [applyDuplicate, setApplyDuplicate] = useState<ApplyDuplicateBundle | null>(null);
  const [applyDuplicateAck, setApplyDuplicateAck] = useState(false);
  const [dupLinkShowingId, setDupLinkShowingId] = useState<string | null>(null);
  /** JSON.stringify(buildUpdatePayload(row)) after last open/save/server sync — modal dirty when current detail differs. */
  const [savedModalFingerprint, setSavedModalFingerprint] = useState<string | null>(null);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteSubject, setPasteSubject] = useState("");
  const [pasteBody, setPasteBody] = useState("");
  const [pasteSender, setPasteSender] = useState("");
  const [pasteReceivedAt, setPasteReceivedAt] = useState("");
  const [pasting, setPasting] = useState(false);
  const [gmailImporting, setGmailImporting] = useState(false);
  const [gmailImportStatus, setGmailImportStatus] = useState<SupraGmailImportStatus | null>(null);
  const [hasGmailConnection, setHasGmailConnection] = useState(false);
  const [gmailAutomationLoading, setGmailAutomationLoading] = useState(true);
  const [gmailAutomationToggleLoading, setGmailAutomationToggleLoading] = useState(false);
  const [automationEnabledLocal, setAutomationEnabledLocal] = useState(true);
  const [pasteModalError, setPasteModalError] = useState<string | null>(null);
  /** Which intake fields were filled from a smart paste (for reviewer clarity). */
  const [pasteSplitDetected, setPasteSplitDetected] = useState<SplitPastedEmailBlobDetected | null>(null);
  /** Brief table row emphasis after manual paste */
  const [highlightQueueRowId, setHighlightQueueRowId] = useState<string | null>(null);
  /** Show “just pasted” strip at top of review modal */
  const [pastedReviewBannerId, setPastedReviewBannerId] = useState<string | null>(null);
  const [reviewRawExpanded, setReviewRawExpanded] = useState(false);
  const [reviewAdvancedOpen, setReviewAdvancedOpen] = useState(false);
  const pasteBodyRef = useRef<HTMLTextAreaElement>(null);
  const [parseDrafting, setParseDrafting] = useState(false);
  const [propertySuggestions, setPropertySuggestions] = useState<PropertySuggestionRow[]>([]);
  const [propertySuggestLoading, setPropertySuggestLoading] = useState(false);
  const [showingSuggestions, setShowingSuggestions] = useState<ShowingSuggestionRow[]>([]);
  const [showingSuggestLoading, setShowingSuggestLoading] = useState(false);
  const [clearingTestInbox, setClearingTestInbox] = useState(false);

  const applyReadiness = useMemo(() => getApplyReadiness(detail), [detail]);

  const clearableQueueCount = useMemo(
    () => items.filter((i) => i.queueState !== QueueStates.APPLIED).length,
    [items]
  );

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/v1/showing-hq/supra-queue");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error?.message ?? UI_COPY.errors.load("queue"));
      setItems([]);
      return;
    }
    const raw = (json.data ?? []) as ItemWithRelations[];
    setItems(raw.map(normalizeItem));
  }, []);

  const loadGmailAutomation = useCallback(async () => {
    setGmailAutomationLoading(true);
    try {
      const [settingsRes, connRes] = await Promise.all([
        fetch("/api/v1/showing-hq/supra-gmail-import-settings"),
        fetch("/api/v1/settings/connections"),
      ]);
      const settingsJson = (await settingsRes.json().catch(() => ({}))) as {
        data?: {
          automationEnabled?: boolean;
          lastRunAt?: string | null;
          lastRunSuccess?: boolean | null;
          lastRunImported?: number | null;
          lastRunRefreshed?: number | null;
          lastRunScanned?: number | null;
          lastRunError?: string | null;
        };
      };
      const connJson = (await connRes.json().catch(() => ({}))) as {
        data?: { connections?: Array<{ service: string }> };
      };

      if (settingsRes.ok && settingsJson.data) {
        const d = settingsJson.data;
        const merged: SupraGmailImportStatus = {
          ...defaultSupraGmailImportStatus(),
          automationEnabled: d.automationEnabled ?? true,
          lastRunAt: d.lastRunAt ?? null,
          lastRunSuccess: d.lastRunSuccess ?? null,
          lastRunImported: d.lastRunImported ?? null,
          lastRunRefreshed: d.lastRunRefreshed ?? null,
          lastRunScanned: d.lastRunScanned ?? null,
          lastRunError: d.lastRunError ?? null,
        };
        setGmailImportStatus(merged);
        setAutomationEnabledLocal(merged.automationEnabled);
      } else {
        setGmailImportStatus(null);
      }

      const conns = connJson.data?.connections ?? [];
      setHasGmailConnection(conns.some((c) => c.service === "gmail"));
    } finally {
      setGmailAutomationLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    const q = searchParams.get("queue")?.trim();
    if (!q) return;
    setHighlightQueueRowId(q);
    setFilterPreset("all");
  }, [searchParams]);

  useEffect(() => {
    void loadGmailAutomation();
  }, [loadGmailAutomation]);

  useEffect(() => {
    if (!successInfo) return;
    const t = setTimeout(() => setSuccessInfo(null), 8000);
    return () => clearTimeout(t);
  }, [successInfo]);

  useEffect(() => {
    if (!highlightQueueRowId) return;
    const el = document.getElementById(`supra-queue-row-${highlightQueueRowId}`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const clear = setTimeout(() => setHighlightQueueRowId(null), 7000);
    return () => clearTimeout(clear);
  }, [highlightQueueRowId]);

  useEffect(() => {
    setReviewRawExpanded(false);
    setReviewAdvancedOpen(false);
  }, [detail?.id]);

  useEffect(() => {
    if (!modalOpen || !detail?.id) return;
    if (!items.some((r) => r.id === detail.id)) {
      setModalOpen(false);
      setDetail(null);
      setSavedModalFingerprint(null);
      setApplyDuplicate(null);
      setApplyDuplicateAck(false);
      setPastedReviewBannerId(null);
    }
  }, [modalOpen, detail?.id, items]);

  useEffect(() => {
    if (!pasteModalOpen) return;
    setPasteModalError(null);
    const id = requestAnimationFrame(() => pasteBodyRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [pasteModalOpen]);

  /* Intentional deps: refetch when parsed address lines change, not on every detail field edit */
  useEffect(() => {
    if (!modalOpen || !detail) {
      setPropertySuggestions([]);
      return;
    }
    const a1 = detail.parsedAddress1?.trim();
    const city = detail.parsedCity?.trim() ?? "";
    const st = detail.parsedState?.trim();
    const zip = detail.parsedZip?.trim() ?? "";
    const zipOk = zip.replace(/\D/g, "").length >= 5;
    if (!a1 || !st || (!city && !zipOk)) {
      setPropertySuggestions([]);
      return;
    }
    let cancelled = false;
    setPropertySuggestLoading(true);
    const q = new URLSearchParams({ address1: a1, state: st, city });
    if (zip) q.set("zip", zip);
    fetch(`/api/v1/showing-hq/properties/suggest?${q.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setPropertySuggestions(Array.isArray(json.data?.suggestions) ? json.data.suggestions : []);
      })
      .catch(() => {
        if (!cancelled) setPropertySuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setPropertySuggestLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
  }, [modalOpen, detail?.id, detail?.parsedAddress1, detail?.parsedCity, detail?.parsedState, detail?.parsedZip]);

  useEffect(() => {
    if (!modalOpen || !detail) {
      setShowingSuggestions([]);
      setShowingSuggestLoading(false);
      return;
    }
    const at = detail.parsedScheduledAt;
    if (!at) {
      setShowingSuggestions([]);
      setShowingSuggestLoading(false);
      return;
    }
    const t = new Date(at).getTime();
    if (Number.isNaN(t)) {
      setShowingSuggestions([]);
      setShowingSuggestLoading(false);
      return;
    }

    const pid = detail.matchedPropertyId?.trim();
    const scheduledIso = new Date(at).toISOString();
    const windowHours = "4";

    let q: URLSearchParams;
    if (pid) {
      q = new URLSearchParams({
        propertyId: pid,
        scheduledAt: scheduledIso,
        windowHours,
      });
    } else {
      if (propertySuggestLoading) {
        setShowingSuggestions([]);
        setShowingSuggestLoading(false);
        return;
      }
      const cand = candidatePropertyIdsForShowingSuggest(propertySuggestions);
      if (cand.length === 0) {
        setShowingSuggestions([]);
        setShowingSuggestLoading(false);
        return;
      }
      q = new URLSearchParams({
        candidatePropertyIds: cand.join(","),
        scheduledAt: scheduledIso,
        windowHours,
      });
    }

    let cancelled = false;
    setShowingSuggestLoading(true);

    fetch(`/api/v1/showing-hq/showings/suggest?${q.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setShowingSuggestions(Array.isArray(json.data?.suggestions) ? json.data.suggestions : []);
      })
      .catch(() => {
        if (!cancelled) setShowingSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setShowingSuggestLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- property suggestions feed candidate showing lookup
  }, [
    modalOpen,
    detail?.id,
    detail?.matchedPropertyId,
    detail?.parsedScheduledAt,
    propertySuggestions,
    propertySuggestLoading,
  ]);

  const inboxAutomationSummary = useMemo(() => {
    if (!gmailImportStatus) return null;
    return automationEnabledLocal
      ? "Automatic import is on."
      : "Automatic import is off. We’ll only check Gmail when you run it yourself.";
  }, [gmailImportStatus, automationEnabledLocal]);

  const gmailLastRunLabel = gmailImportStatus
    ? relTimeShort(gmailImportStatus.lastRunAt)
    : null;
  const gmailResultSummary = gmailImportStatus
    ? formatSupraGmailImportResultSummary(gmailImportStatus, hasGmailConnection)
    : null;

  const counts = useMemo(() => {
    let ingested = 0;
    let needsReview = 0;
    let ready = 0;
    let failed = 0;
    let closed = 0;
    let active = 0;
    for (const row of items) {
      if (row.queueState === QueueStates.INGESTED) ingested += 1;
      if (row.queueState === QueueStates.NEEDS_REVIEW) needsReview += 1;
      if (row.queueState === QueueStates.READY_TO_APPLY) ready += 1;
      if (row.queueState === QueueStates.FAILED_PARSE) failed += 1;
      if (
        row.queueState === QueueStates.DISMISSED ||
        row.queueState === QueueStates.DUPLICATE ||
        row.queueState === QueueStates.APPLIED
      ) {
        closed += 1;
      }
      if (!isTerminalInboxState(row.queueState) && !isHiddenFromNeedsAttentionFilter(row)) {
        active += 1;
      }
    }
    return { ingested, needsReview, ready, failed, closed, active, total: items.length };
  }, [items]);

  const showingSuggestMultiProperty = useMemo(
    () => new Set(showingSuggestions.map((s) => s.propertyId)).size > 1,
    [showingSuggestions]
  );

  const displayedItems = useMemo(() => {
    switch (filterPreset) {
      case "active":
        return items.filter(
          (i) => !isTerminalInboxState(i.queueState) && !isHiddenFromNeedsAttentionFilter(i)
        );
      case "ingested":
        return items.filter((i) => i.queueState === QueueStates.INGESTED);
      case "needs_review":
        return items.filter((i) => i.queueState === QueueStates.NEEDS_REVIEW);
      case "ready_to_apply":
        return items.filter((i) => i.queueState === QueueStates.READY_TO_APPLY);
      case "failed_parse":
        return items.filter((i) => i.queueState === QueueStates.FAILED_PARSE);
      case "closed":
        return items.filter(
          (i) =>
            i.queueState === QueueStates.DISMISSED ||
            i.queueState === QueueStates.DUPLICATE ||
            i.queueState === QueueStates.APPLIED
        );
      default:
        return items;
    }
  }, [items, filterPreset]);

  const buildUpdatePayload = (row: ItemWithRelations) => ({
    subject: row.subject,
    rawBodyText: row.rawBodyText,
    sender: row.sender,
    parsedAddress1: row.parsedAddress1,
    parsedCity: row.parsedCity,
    parsedState: row.parsedState,
    parsedZip: row.parsedZip,
    parsedScheduledAt: row.parsedScheduledAt
      ? new Date(row.parsedScheduledAt).toISOString()
      : null,
    parsedEventKind: row.parsedEventKind,
    parsedStatus: row.parsedStatus,
    parsedAgentName: row.parsedAgentName,
    parsedAgentEmail: row.parsedAgentEmail,
    parseConfidence: row.parseConfidence,
    proposedAction: row.proposedAction,
    propertyMatchStatus: row.propertyMatchStatus,
    showingMatchStatus: row.showingMatchStatus,
    matchedPropertyId: row.matchedPropertyId?.trim() || null,
    matchedShowingId: row.matchedShowingId?.trim() || null,
    resolutionNotes: row.resolutionNotes,
    queueState: row.queueState,
  });

  /** PATCH queue item; throws on failure. Used by Save, Save & apply, and link-to-showing. */
  const performPatchQueueItem = async (
    id: string,
    body: Record<string, unknown>
  ): Promise<ItemWithRelations> => {
    const res = await fetch(`/api/v1/showing-hq/supra-queue/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message ?? "Update failed");
    return normalizeItem(json.data as ItemWithRelations);
  };

  const handleDeleteFromList = async (row: ItemWithRelations) => {
    const ok = window.confirm(
      "Permanently delete this Supra queue row? This cannot be undone. Properties and showings are not removed."
    );
    if (!ok) return;
    setDeletingRowId(row.id);
    try {
      const res = await fetch(`/api/v1/showing-hq/supra-queue/${row.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Delete failed");
      if (detail?.id === row.id) {
        setModalOpen(false);
        setDetail(null);
        setSavedModalFingerprint(null);
        setApplyDuplicate(null);
        setApplyDuplicateAck(false);
        setPastedReviewBannerId(null);
      }
      await load();
      setSuccessInfo({ message: "Queue row deleted." });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingRowId(null);
    }
  };

  const modalHasUnsavedEdits = useMemo(() => {
    if (!detail || savedModalFingerprint === null) return false;
    return JSON.stringify(buildUpdatePayload(detail)) !== savedModalFingerprint;
  }, [detail, savedModalFingerprint]);

  const patchGmailAutomationEnabled = async (enabled: boolean) => {
    setGmailAutomationToggleLoading(true);
    try {
      const res = await fetch("/api/v1/showing-hq/supra-gmail-import-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automationEnabled: enabled }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Couldn’t update import settings");
        return;
      }
      setAutomationEnabledLocal(enabled);
      await loadGmailAutomation();
    } catch {
      toast.error("Couldn’t update import settings");
    } finally {
      setGmailAutomationToggleLoading(false);
    }
  };

  const importFromGmail = async () => {
    setGmailImporting(true);
    try {
      const res = await fetch("/api/v1/showing-hq/supra-queue/import-gmail", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Gmail import failed");
        return;
      }
      const { imported, refreshed = 0, skipped, scanned, autoParsed = 0 } = json.data as {
        imported: number;
        refreshed?: number;
        skipped: number;
        scanned: number;
        autoParsed?: number;
      };
      await load();
      await loadGmailAutomation();
      setFilterPreset("active");
      setSuccessInfo({
        message: `Gmail: ${imported} new, ${refreshed} refreshed, ${autoParsed} auto-parsed to NEEDS_REVIEW, ${skipped} skipped (${scanned} scanned, last ~14 days, Supra senders).`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gmail import failed");
    } finally {
      setGmailImporting(false);
    }
  };

  const clearTestInbox = async () => {
    const confirmed = window.confirm(
      "Clear all Supra inbox queue rows except items already marked APPLIED?\n\n" +
        "This only deletes Supra queue rows on your account. It does not remove properties, showings, or any other records."
    );
    if (!confirmed) return;
    setClearingTestInbox(true);
    try {
      const res = await fetch("/api/v1/showing-hq/supra-queue/clear", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Failed to clear queue");
        return;
      }
      const deletedCount =
        typeof json.data?.deletedCount === "number" ? json.data.deletedCount : 0;
      await load();
      setFilterPreset("active");
      setSuccessInfo({
        message: `Removed ${deletedCount} queue row(s). Applied rows were kept. Properties and showings were not changed.`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to clear queue");
    } finally {
      setClearingTestInbox(false);
    }
  };

  const openPasteModal = () => {
    setPasteSubject("");
    setPasteBody("");
    setPasteSender("");
    setPasteModalError(null);
    setPasteSplitDetected(null);
    setPasteReceivedAt(new Date().toISOString().slice(0, 16));
    setPasteModalOpen(true);
  };

  const handlePasteEmailBlob = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text?.trim()) return;
    const result = splitPastedEmailBlob(text);
    if (!pastedBlobHasDetectedFields(result)) return;
    e.preventDefault();
    setPasteBody(result.fullText);
    if (result.detected.subject && result.subject) setPasteSubject(result.subject);
    if (result.detected.sender && result.sender) setPasteSender(result.sender);
    if (result.detected.receivedAt && result.receivedAt) {
      setPasteReceivedAt(dateToDatetimeLocalInputValue(result.receivedAt));
    }
    setPasteSplitDetected({ ...result.detected });
  };

  const submitManualPaste = async () => {
    if (!pasteSubject.trim() || !pasteBody.trim()) {
      setPasteModalError("Add a subject and the message body (both are required).");
      return;
    }
    setPasting(true);
    setPasteModalError(null);
    try {
      const body: Record<string, unknown> = {
        subject: pasteSubject.trim(),
        rawBodyText: pasteBody,
        sender: pasteSender.trim() || null,
      };
      if (pasteReceivedAt.trim()) {
        body.receivedAt = new Date(pasteReceivedAt).toISOString();
      }
      const res = await fetch("/api/v1/showing-hq/supra-queue/manual-paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to add pasted email");
      const created = normalizeItem(json.data as ItemWithRelations);
      setPasteModalOpen(false);
      await load();
      setFilterPreset("ingested");
      setHighlightQueueRowId(created.id);
      setPastedReviewBannerId(created.id);
      setSuccessInfo({
        message:
          "Saved as Ingested (raw). Review opened — run parser or edit the raw body, then Save.",
      });
      openDetail(created);
    } catch (e) {
      setPasteModalError(e instanceof Error ? e.message : "Paste failed");
    } finally {
      setPasting(false);
    }
  };

  const openDetail = (row: ItemWithRelations) => {
    setApplyDuplicate(null);
    setApplyDuplicateAck(false);
    const n = normalizeItem(row);
    setDetail(n);
    setSavedModalFingerprint(JSON.stringify(buildUpdatePayload(n)));
    setModalOpen(true);
  };

  const selectPropertySuggestion = (s: PropertySuggestionRow) => {
    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        matchedPropertyId: s.id,
        matchedProperty: {
          id: s.id,
          address1: s.address1,
          city: s.city,
          state: s.state,
          zip: s.zip,
        },
        matchedShowingId: null,
        matchedShowing: null,
      };
    });
  };

  const selectShowingSuggestion = (s: ShowingSuggestionRow) => {
    setDetail((prev) => {
      if (!prev) return prev;
      const prop = s.property;
      return {
        ...prev,
        matchedPropertyId: prop.id,
        matchedProperty: {
          id: prop.id,
          address1: prop.address1,
          city: prop.city,
          state: prop.state,
          zip: prop.zip,
        },
        matchedShowingId: s.id,
        matchedShowing: {
          id: s.id,
          scheduledAt: new Date(s.scheduledAt),
          propertyId: prop.id,
        },
      };
    });
  };

  const clearShowingMatch = () => {
    setDetail((prev) =>
      prev ? { ...prev, matchedShowingId: null, matchedShowing: null } : prev
    );
  };

  const handleParseDraft = async () => {
    if (!detail) return;
    setParseDrafting(true);
    try {
      const res = await fetch(`/api/v1/showing-hq/supra-queue/${detail.id}/parse-draft`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Parse draft failed");
      const row = json.data?.item as ItemWithRelations;
      if (row) {
        const n = normalizeItem(row);
        setDetail(n);
        setSavedModalFingerprint(JSON.stringify(buildUpdatePayload(n)));
      }
      await load();
      setSuccessInfo({
        message:
          typeof json.data?.message === "string"
            ? json.data.message
            : "Supra parser filled draft fields — review before apply.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Parse draft failed");
    } finally {
      setParseDrafting(false);
    }
  };

  const postApplyRequest = async (item: ItemWithRelations, confirmDuplicateOverride: boolean) => {
    const res = await fetch(`/api/v1/showing-hq/supra-queue/${item.id}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmDuplicateOverride }),
    });
    const json = await res.json();
    return { res, json } as const;
  };

  const linkQueueToExistingShowing = async (
    conflict: ApplyDuplicateBundle["conflicts"][number],
    bundle: ApplyDuplicateBundle
  ) => {
    const prop = conflict.property ?? bundle.context.property;
    if (!prop || !detail) return;
    setDupLinkShowingId(conflict.id);
    try {
      const updated = await performPatchQueueItem(detail.id, {
        matchedPropertyId: prop.id,
        matchedShowingId: conflict.id,
      });
      setDetail(updated);
      setSavedModalFingerprint(JSON.stringify(buildUpdatePayload(updated)));
      setApplyDuplicate(null);
      setApplyDuplicateAck(false);
      setSuccessInfo({
        message:
          "Linked on the server. Apply again to update that showing (duplicate block should clear).",
      });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not link showing");
    } finally {
      setDupLinkShowingId(null);
    }
  };

  const handleApply = async () => {
    if (!detail || !applyReadiness.ok) return;
    setApplying(true);
    try {
      let d = detail;
      if (
        savedModalFingerprint !== null &&
        JSON.stringify(buildUpdatePayload(detail)) !== savedModalFingerprint
      ) {
        d = await performPatchQueueItem(detail.id, buildUpdatePayload(detail));
        setDetail(d);
        setSavedModalFingerprint(JSON.stringify(buildUpdatePayload(d)));
        await load();
        if (TERMINAL_STATES.includes(d.queueState)) {
          setModalOpen(false);
          setDetail(null);
          setSavedModalFingerprint(null);
          return;
        }
        const afterSave = getApplyReadiness(d);
        if (!afterSave.ok) {
          toast.error(
            afterSave.reasons.length > 0
              ? afterSave.reasons.join(" ")
              : "Saved, but this item is not ready to apply yet."
          );
          return;
        }
      }

      const { res, json } = await postApplyRequest(d, applyDuplicateAck);
      if (res.status === 409 && json.error?.code === "DUPLICATE_SHOWING_WINDOW") {
        const dup = parseApplyDuplicate409(json as Record<string, unknown>, d);
        if (dup) setApplyDuplicate(dup);
        else setApplyDuplicate(null);
        toast.error(
          "Apply paused: another showing falls in the duplicate time window. Use the details below to link or override."
        );
        return;
      }
      if (!res.ok) throw new Error(json.error?.message ?? "Apply failed");
      setApplyDuplicate(null);
      setApplyDuplicateAck(false);
      setModalOpen(false);
      setDetail(null);
      setSavedModalFingerprint(null);
      await load();
      const applyMeta = json.data as {
        createdProperty?: boolean;
        updatedShowing?: boolean;
        buyerAgentFeedbackDraftReady?: boolean;
        showingId?: string;
      };
      const base = applyMeta?.updatedShowing
        ? "Applied: showing updated and queue item marked complete."
        : "Applied: new showing created (source: Supra).";
      const msgCore = applyMeta?.createdProperty
        ? `${base} A new property was created from the parsed address.`
        : base;
      const draftReady = Boolean(applyMeta?.buyerAgentFeedbackDraftReady);
      const sid =
        typeof applyMeta?.showingId === "string" && applyMeta.showingId.trim() ? applyMeta.showingId.trim() : undefined;
      setSuccessInfo({
        message: draftReady ? `${msgCore} Buyer-agent feedback email draft is ready.` : msgCore,
        buyerAgentFeedbackDraftReady: draftReady,
        applyShowingId: draftReady ? sid : undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setApplying(false);
    }
  };

  const handleApplyFromList = async (row: ItemWithRelations) => {
    if (!getApplyReadiness(row).ok) return;
    setApplyingRowId(row.id);
    try {
      const { res, json } = await postApplyRequest(row, false);
      if (res.status === 409 && json.error?.code === "DUPLICATE_SHOWING_WINDOW") {
        const normalized = normalizeItem(row);
        setDetail(normalized);
        setSavedModalFingerprint(JSON.stringify(buildUpdatePayload(normalized)));
        setModalOpen(true);
        const dup = parseApplyDuplicate409(json as Record<string, unknown>, normalized);
        if (dup) setApplyDuplicate(dup);
        else setApplyDuplicate(null);
        toast.error(
          "Apply paused: another showing falls in the duplicate time window. Use the details below to link or override."
        );
        return;
      }
      if (!res.ok) throw new Error(json.error?.message ?? "Apply failed");
      setApplyDuplicate(null);
      setApplyDuplicateAck(false);
      await load();
      const d = json.data as {
        createdProperty?: boolean;
        updatedShowing?: boolean;
        buyerAgentFeedbackDraftReady?: boolean;
        showingId?: string;
      };
      const base = d?.updatedShowing
        ? "Applied: showing updated and queue item marked complete."
        : "Applied: new showing created (source: Supra).";
      const msgCore = d?.createdProperty
        ? `${base} A new property was created from the parsed address.`
        : base;
      const draftReady = Boolean(d?.buyerAgentFeedbackDraftReady);
      const sid =
        typeof d?.showingId === "string" && d.showingId.trim() ? d.showingId.trim() : undefined;
      setSuccessInfo({
        message: draftReady ? `${msgCore} Buyer-agent feedback email draft is ready.` : msgCore,
        buyerAgentFeedbackDraftReady: draftReady,
        applyShowingId: draftReady ? sid : undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setApplyingRowId(null);
    }
  };

  const patchItem = async (id: string, body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const updated = await performPatchQueueItem(id, body);
      setApplyDuplicate(null);
      setApplyDuplicateAck(false);
      setDetail(updated);
      setSavedModalFingerprint(JSON.stringify(buildUpdatePayload(updated)));
      await load();
      if (TERMINAL_STATES.includes(updated.queueState)) {
        setModalOpen(false);
        setDetail(null);
        setSavedModalFingerprint(null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDetail = async () => {
    if (!detail) return;
    await patchItem(detail.id, buildUpdatePayload(detail));
    setSuccessInfo({ message: "Review saved." });
  };

  const applyStateWithCurrentEdits = async (state: SupraQueueState) => {
    if (!detail) return;
    await patchItem(detail.id, { ...buildUpdatePayload(detail), queueState: state });
    setSuccessInfo({
      message:
        state === QueueStates.READY_TO_APPLY
          ? "Marked ready to apply (no showing created yet)."
          : state === QueueStates.FAILED_PARSE
            ? "Marked failed parse."
            : state === QueueStates.DISMISSED
              ? "Item dismissed."
              : state === QueueStates.DUPLICATE
                ? "Marked duplicate."
                : "Updated.",
    });
  };

  type SampleKind = "typical" | "low_confidence" | "failed_parse" | "ready_to_apply";

  const addSampleRow = async (kind: SampleKind) => {
    setSeeding(true);
    setSampleMenuOpen(false);
    const ts = Date.now();
    const base = {
      externalMessageId: `manual-test-${kind}-${ts}@keypilot.local`,
      receivedAt: new Date().toISOString(),
      sender: "notifications@supra.example",
    };

    let body: Record<string, unknown>;

    switch (kind) {
      case "low_confidence":
        body = {
          ...base,
          subject: "Supra: Showing notice (unclear)",
          rawBodyText:
            "Fwd: showing\nsome address maybe 456 Oak\nFriday afternoon\ncontact bob@example.com",
          parsedAddress1: "456 Oak (uncertain)",
          parsedCity: "Austin",
          parsedState: "TX",
          parsedZip: "",
          parsedScheduledAt: null,
          parsedEventKind: "unknown",
          parsedStatus: "unknown",
          parsedAgentName: null,
          parsedAgentEmail: null,
          parseConfidence: "LOW",
          proposedAction: "NEEDS_MANUAL_REVIEW",
          propertyMatchStatus: "NO_MATCH",
          showingMatchStatus: "NO_SHOWING",
        };
        break;
      case "failed_parse":
        body = {
          ...base,
          externalMessageId: `manual-test-failed-${ts}@keypilot.local`,
          subject: "Supra: Could not parse notification",
          rawBodyText:
            "Empty or garbled payload for testing failed_parse state.\n\n----\nBinary or template noise ███",
          parsedAddress1: null,
          parsedCity: null,
          parsedState: null,
          parsedZip: null,
          parsedScheduledAt: null,
          parsedEventKind: null,
          parsedStatus: null,
          parsedAgentName: null,
          parsedAgentEmail: null,
          parseConfidence: "LOW",
          proposedAction: "UNKNOWN",
          propertyMatchStatus: "UNSET",
          showingMatchStatus: "UNSET",
          queueState: "FAILED_PARSE",
        };
        break;
      case "ready_to_apply":
        body = {
          ...base,
          externalMessageId: `manual-test-ready-${ts}@keypilot.local`,
          subject: "Supra: Showing confirmed — 789 Elm St",
          rawBodyText:
            "Your showing is confirmed.\n\n789 Elm Street, Dallas TX 75201\nPrivate showing: Sat 10:00 AM\nAgent: Alex Rivera <alex@example.com>",
          parsedAddress1: "789 Elm Street",
          parsedCity: "Dallas",
          parsedState: "TX",
          parsedZip: "75201",
          parsedScheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
          parsedEventKind: "private_showing",
          parsedStatus: "confirmed",
          parsedAgentName: "Alex Rivera",
          parsedAgentEmail: "alex@example.com",
          parseConfidence: "HIGH",
          proposedAction: "CREATE_SHOWING",
          propertyMatchStatus: "NO_MATCH",
          showingMatchStatus: "NO_SHOWING",
          queueState: "READY_TO_APPLY",
        };
        break;
      default:
        body = {
          ...base,
          subject: "Supra: Showing scheduled — 123 Main St",
          rawBodyText:
            "Placeholder Supra email body (parser not connected yet).\n\n123 Main Street\nAustin, TX 78701\nPrivate showing: Friday 2:00–3:00 PM",
          parsedAddress1: "123 Main Street",
          parsedCity: "Austin",
          parsedState: "TX",
          parsedZip: "78701",
          parsedScheduledAt: new Date().toISOString(),
          parsedEventKind: "private_showing",
          parsedStatus: "scheduled",
          parsedAgentName: "Jane Agent",
          parsedAgentEmail: "jane@example.com",
          parseConfidence: "MEDIUM",
          proposedAction: "CREATE_SHOWING",
          propertyMatchStatus: "NO_MATCH",
          showingMatchStatus: "NO_SHOWING",
        };
    }

    try {
      const res = await fetch("/api/v1/showing-hq/supra-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to add sample");
      await load();
      setFilterPreset("active");
      setSuccessInfo({
        message:
          kind === "typical"
            ? "Sample row added (needs review). Open Review to edit or change state."
            : kind === "low_confidence"
              ? "Low-confidence sample added — good for testing corrections."
              : kind === "failed_parse"
                ? "Failed-parse sample added."
                : "Ready-to-apply sample added (still no auto-create).",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add sample");
    } finally {
      setSeeding(false);
    }
  };

  const filterChip = (
    preset: FilterPreset,
    label: string,
    count?: number,
    activeClass?: string
  ) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        filterPreset === preset
          ? cn(activeClass ?? supraBtnPrimary, "border-transparent")
          : supraBtnSecondary
      )}
      onClick={() => setFilterPreset(preset)}
    >
      {label}
      {count !== undefined && count > 0 ? (
        <span
          className={cn(
            "ml-1.5 rounded-full border px-1.5 text-[12px] font-bold tabular-nums",
            filterPreset === preset
              ? "border-white/30 bg-white/15 text-inherit"
              : "border-kp-outline bg-kp-bg text-kp-on-surface"
          )}
        >
          {count}
        </span>
      ) : null}
    </Button>
  );

  if (loading && items.length === 0) {
    return <PageLoading message="Loading Supra queue…" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {successInfo ? (
        <div
          className="flex gap-2 rounded-lg border border-kp-teal/35 bg-kp-teal/[0.12] px-3 py-2 text-sm font-medium text-kp-on-surface"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="leading-snug">{successInfo.message}</p>
            {successInfo.buyerAgentFeedbackDraftReady ? (
              <Link
                href={
                  successInfo.applyShowingId
                    ? `/showing-hq/showings/${successInfo.applyShowingId}?tab=feedback`
                    : "/showing-hq/showings"
                }
                className="inline-flex text-xs font-semibold text-kp-teal underline-offset-2 hover:underline"
              >
                {successInfo.applyShowingId
                  ? "Open this showing"
                  : "Open Showings — edit the row to use the draft"}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <ErrorMessage message={error} onRetry={() => load()} />
      ) : null}

      {!gmailAutomationLoading && gmailImportStatus && inboxAutomationSummary ? (
        <div className="rounded-xl border border-kp-outline/90 bg-kp-surface-high/60 px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex min-w-0 flex-1 gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-kp-teal/10">
                <Inbox className="h-3.5 w-3.5 text-kp-teal" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold text-kp-on-surface">Gmail import</p>
                <p className="text-[11px] leading-snug text-kp-on-surface-variant">
                  {inboxAutomationSummary}
                </p>
                {hasGmailConnection && gmailLastRunLabel ? (
                  <p className="text-[11px] text-kp-on-surface-variant">
                    Last checked {gmailLastRunLabel}
                    {gmailImportStatus.lastRunSuccess === false ? (
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        {" "}
                        · last run failed
                      </span>
                    ) : gmailImportStatus.lastRunAt ? (
                      <span className="text-kp-on-surface-variant"> · succeeded</span>
                    ) : null}
                  </p>
                ) : null}
                {gmailResultSummary ? (
                  <p className="text-[11px] leading-snug text-kp-on-surface-variant">
                    {gmailResultSummary}
                  </p>
                ) : null}
                {hasGmailConnection ? (
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] text-kp-on-surface-variant">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-kp-outline bg-kp-surface-high text-kp-teal focus:ring-kp-teal/40"
                      checked={automationEnabledLocal}
                      disabled={gmailAutomationToggleLoading}
                      onChange={(e) => void patchGmailAutomationEnabled(e.target.checked)}
                    />
                    <span>
                      {gmailAutomationToggleLoading
                        ? "Saving…"
                        : "Let ShowingHQ check Gmail automatically on a schedule"}
                    </span>
                  </label>
                ) : (
                  <p className="text-[11px] text-kp-on-surface-variant">
                    <Link
                      href="/settings/connections"
                      className="font-medium text-kp-teal underline-offset-2 hover:underline"
                    >
                      Connect Gmail
                    </Link>{" "}
                    under Settings to enable automatic checks.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <p className={t.section}>Filter</p>
          <div className="flex flex-wrap gap-2">
            {filterChip(
              "active",
              "Needs attention",
              counts.active,
              "bg-kp-teal/90 font-semibold text-white shadow-md hover:bg-kp-teal hover:text-white"
            )}
            {filterChip("all", "All", counts.total)}
            {filterChip("ingested", "Ingested (raw)", counts.ingested)}
            {filterChip(
              "needs_review",
              "Needs review",
              counts.needsReview,
              "bg-kp-gold font-semibold text-kp-bg shadow-md hover:bg-kp-gold-bright hover:text-kp-bg"
            )}
            {filterChip("ready_to_apply", "Ready to apply", counts.ready)}
            {filterChip(
              "failed_parse",
              "Failed parse",
              counts.failed,
              "bg-red-700 font-semibold text-white shadow-md hover:bg-red-600 hover:text-white"
            )}
            {filterChip("closed", "Closed", counts.closed)}
          </div>
        </div>

        <div className="relative flex flex-col gap-2">
          <p className={t.section}>Test data</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={supraBtnSecondary}
              disabled={pasting || gmailImporting}
              onClick={openPasteModal}
            >
              Paste Supra email
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(supraBtnPrimary, "border-transparent")}
              disabled={gmailImporting || pasting || !hasGmailConnection}
              onClick={() => void importFromGmail()}
              title={
                hasGmailConnection
                  ? "Check Gmail now for new Supra messages"
                  : "Connect Gmail under Settings → Connections"
              }
            >
              {gmailImporting ? (
                <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
              )}
              {gmailImporting ? "Working…" : "Run now"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(supraBtnTertiary, "border border-dashed border-kp-outline")}
              disabled={seeding}
              onClick={() => addSampleRow("typical")}
            >
              {seeding ? "Adding…" : "Quick sample"}
            </Button>
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(supraBtnTertiary, "border border-kp-outline")}
                disabled={seeding}
                onClick={() => setSampleMenuOpen((o) => !o)}
                aria-expanded={sampleMenuOpen}
                aria-haspopup="menu"
              >
                More samples
                <ChevronDown className="ml-1 h-3.5 w-3.5 text-kp-on-surface/88" />
              </Button>
              {sampleMenuOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 cursor-default bg-transparent"
                    aria-label="Close menu"
                    onClick={() => setSampleMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-kp-outline bg-kp-surface py-1 shadow-lg"
                    role="menu"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-2 text-left text-xs text-kp-on-surface hover:bg-kp-surface-high"
                      onClick={() => addSampleRow("low_confidence")}
                    >
                      Low confidence / unclear body
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-2 text-left text-xs text-kp-on-surface hover:bg-kp-surface-high"
                      onClick={() => addSampleRow("failed_parse")}
                    >
                      Failed parse (terminal state)
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-2 text-left text-xs text-kp-on-surface hover:bg-kp-surface-high"
                      onClick={() => addSampleRow("ready_to_apply")}
                    >
                      Ready to apply (pre-approved sample)
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(supraBtnTertiary, "h-8 self-start text-xs")}
            disabled={
              clearingTestInbox || loading || pasting || gmailImporting || clearableQueueCount === 0
            }
            title={
              clearableQueueCount === 0
                ? "No non-applied queue rows to remove."
                : "Remove test/import queue rows (keeps applied). Does not delete properties or showings."
            }
            onClick={() => void clearTestInbox()}
          >
            {clearingTestInbox ? "Clearing…" : "Clear test inbox"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-kp-outline/90 bg-kp-surface p-3 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04] sm:p-4">
        {displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-kp-outline bg-kp-surface-high text-kp-on-surface/85">
              <Inbox className="h-5 w-5" />
            </div>
            <p className="text-base font-semibold text-kp-on-surface">
              {items.length === 0 ? "No Supra queue items yet" : "Nothing in this filter"}
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-kp-on-surface/88">
              {items.length === 0 ? (
                <>
                  Use <strong>Run now</strong> (needs Gmail connected under Settings) or{" "}
                  <strong>Paste a real Supra email</strong>. You can also add <strong>Quick sample</strong> rows
                  to try the workflow.
                </>
              ) : (
                <>
                  Everything in queue is applied or archived. Open{" "}
                  <strong>All</strong> or <strong>Closed</strong> for history.
                </>
              )}
            </p>
            {items.length === 0 ? (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={supraBtnSecondary}
                  disabled={pasting || gmailImporting}
                  onClick={openPasteModal}
                >
                  Paste a real Supra email
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(supraBtnPrimary, "border-transparent")}
                  disabled={gmailImporting || pasting || !hasGmailConnection}
                  onClick={() => void importFromGmail()}
                >
                  {gmailImporting ? (
                    <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  )}
                  {gmailImporting ? "Working…" : "Run now"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(supraBtnTertiary, "border border-dashed border-kp-outline")}
                  disabled={seeding}
                  onClick={() => addSampleRow("typical")}
                >
                  Add quick sample
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(supraBtnSecondary, "mt-4")}
                onClick={() => setFilterPreset("active")}
              >
                Needs attention
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5 border-b border-kp-outline pb-3">
              <p className="text-sm font-semibold text-kp-on-surface">System log</p>
              <p className="text-[12px] leading-relaxed text-kp-on-surface/90">
                ShowingHQ is where you work. This list is for parsing gaps and edge cases only — end
                notifications complete in the background.
              </p>
            </div>
            {displayedItems.map((row) => {
              const applyReady = getApplyReadiness(row).ok;
              return (
                <SupraInboxQueueRow
                  key={row.id}
                  row={row}
                  applyReadinessOk={applyReady}
                  highlighted={highlightQueueRowId === row.id}
                  showInlineApply={applyReady}
                  applyLoading={applyingRowId === row.id}
                  applyBlockedByOtherRow={
                    applyingRowId !== null && applyingRowId !== row.id
                  }
                  onReview={() => openDetail(row)}
                  onApply={() => void handleApplyFromList(row)}
                />
              );
            })}
          </div>
        )}
      </div>

      <BrandModal
        open={modalOpen}
        descriptionClassName="text-kp-on-surface/92"
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) {
            setDetail(null);
            setSavedModalFingerprint(null);
            setApplyDuplicate(null);
            setApplyDuplicateAck(false);
            setPastedReviewBannerId(null);
            setReviewRawExpanded(false);
            setReviewAdvancedOpen(false);
          }
        }}
        title="Review queue item"
        description="Review and fix on the left, then match and apply on the right. Apply now saves unsaved edits first when needed; queue shortcuts still save current edits."
        size="2xl"
        bodyClassName="max-h-[min(85vh,840px)]"
        footer={
          <div className="flex w-full flex-col gap-3">
            <div className="flex flex-wrap gap-2 border-b border-kp-outline/80 pb-2.5">
              <span className={cn("w-full", reviewModalFooterEyebrow)}>
                Queue shortcuts (save first)
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(supraBtnSecondary, "h-8 border-kp-teal")}
                disabled={
                  saving ||
                  !detail ||
                  detail.queueState === QueueStates.APPLIED
                }
                onClick={() => applyStateWithCurrentEdits(QueueStates.READY_TO_APPLY)}
              >
                Mark ready to apply
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(supraBtnSecondary, "h-8")}
                disabled={
                  saving ||
                  !detail ||
                  detail.queueState === QueueStates.APPLIED
                }
                onClick={() => applyStateWithCurrentEdits(QueueStates.NEEDS_REVIEW)}
              >
                Back to needs review
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(supraBtnDangerSecondary, "h-8")}
                disabled={
                  saving ||
                  !detail ||
                  detail.queueState === QueueStates.APPLIED
                }
                onClick={() => applyStateWithCurrentEdits(QueueStates.FAILED_PARSE)}
              >
                Mark failed parse
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(supraBtnSecondary, "h-8")}
                disabled={
                  saving ||
                  !detail ||
                  detail.queueState === QueueStates.APPLIED
                }
                onClick={() => applyStateWithCurrentEdits(QueueStates.DISMISSED)}
              >
                Dismiss
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(supraBtnSecondary, "h-8")}
                disabled={
                  saving ||
                  !detail ||
                  detail.queueState === QueueStates.APPLIED
                }
                onClick={() => applyStateWithCurrentEdits(QueueStates.DUPLICATE)}
              >
                Mark duplicate
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(supraBtnDangerSecondary, "h-8")}
                disabled={saving || !detail || detail.queueState === QueueStates.APPLIED}
                onClick={() => detail && void handleDeleteFromList(detail)}
              >
                {deletingRowId === detail?.id ? "Deleting…" : "Delete row"}
              </Button>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(supraBtnTertiary, "h-8")}
                onClick={() => setModalOpen(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(supraBtnSave, "h-8 border-transparent")}
                disabled={saving || !detail}
                onClick={handleSaveDetail}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        }
      >
        {detail ? (
          <div className="flex flex-col gap-3">
            {detail.id === pastedReviewBannerId ? (
              <div
                className="flex items-start gap-2 rounded-lg border border-kp-teal/40 bg-kp-teal/[0.12] px-3 py-2 shadow-sm"
                role="status"
              >
                <ClipboardPaste className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-kp-on-surface">Just pasted — raw email only</p>
                  <p className={cn("mt-0.5", reviewModalBannerBody)}>
                    This row is <strong className="text-kp-on-surface">Ingested</strong>. On larger screens, use{" "}
                    <strong className="text-kp-on-surface">Run parser → fill draft</strong> in the right column, or
                    edit subject/body on the left, then <strong className="text-kp-on-surface">Save</strong>.
                  </p>
                </div>
              </div>
            ) : null}
            {/* Decision banner — when apply-ready, show teal / “Apply ready” even if queue state is NEEDS_REVIEW */}
            {(() => {
              const applyReadyBanner =
                applyReadiness.ok &&
                !TERMINAL_STATES.includes(detail.queueState) &&
                detail.queueState !== QueueStates.FAILED_PARSE;
              return (
            <div
              className={cn(
                "rounded-lg border px-3 py-2",
                detail.queueState === QueueStates.FAILED_PARSE
                  ? "border-red-700/45 bg-red-950/35"
                  : applyReadyBanner || detail.queueState === QueueStates.READY_TO_APPLY
                    ? "border-kp-teal/45 bg-kp-teal/[0.12]"
                    : isAwaitingDecision(detail.queueState)
                      ? "border-kp-gold/45 bg-kp-gold/[0.12]"
                      : "border-kp-outline bg-kp-surface-high"
              )}
            >
              <div className="flex flex-wrap items-start gap-2.5">
                {detail.queueState === QueueStates.FAILED_PARSE ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                ) : applyReadyBanner || detail.queueState === QueueStates.READY_TO_APPLY ? (
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" />
                ) : (
                  <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-kp-gold" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      variant={
                        applyReadyBanner || detail.queueState === QueueStates.READY_TO_APPLY
                          ? "sold"
                          : queueStateBadgeVariant(detail.queueState)
                      }
                      dot
                    >
                      {applyReadyBanner
                        ? "Apply ready"
                        : formatEnumLabel(detail.queueState)}
                    </StatusBadge>
                  </div>
                  <p className="mt-1.5 text-sm leading-snug text-kp-on-surface">
                    {detail.queueState === QueueStates.FAILED_PARSE
                      ? "Treat the body as unusable unless you fix it — expand Raw source on the left if needed."
                      : applyReadyBanner || detail.queueState === QueueStates.READY_TO_APPLY
                        ? "Schedule and address/property meet apply requirements — use Apply on the board or Apply now here."
                        : isAwaitingDecision(detail.queueState)
                          ? "Add schedule and a linked property or full parsed address to enable Apply."
                          : "This item is closed in the queue."}
                  </p>
                </div>
              </div>
            </div>
              );
            })()}

            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(15.5rem,18rem)] lg:grid-cols-[minmax(0,1fr)_minmax(17.5rem,20rem)] xl:grid-cols-[minmax(0,1fr)_22rem]">
              {/* Left: primary editing column */}
              <div className="min-w-0 space-y-2">
            <p className={reviewWorkflowRail}>Review &amp; fix</p>
            <div className="space-y-3 rounded-lg border border-kp-outline bg-kp-surface p-4">
              <h3 className={reviewSectionTitle}>Parsed fields</h3>
              {detail.parseConfidence === Confidences.LOW ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-950/35 px-3 py-2 text-sm text-amber-50">
                  <span className="font-semibold">Low parse confidence.</span>{" "}
                  <span className="text-amber-50/90">
                    Double-check address and time. You can still apply when schedule and full address (or a
                    linked property) are set — same rules as higher confidence.
                  </span>
                </div>
              ) : null}
              {!detail.parsedAddress1?.trim() && !detail.matchedPropertyId?.trim() ? (
                <div className="rounded-md border border-kp-outline/90 bg-kp-surface-high px-3 py-2 text-sm text-kp-on-surface">
                  No parsed street address — fill address or link a property before applying.
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className={reviewFormLabel}>Address line 1</Label>
                  <Input
                    className={cn("mt-1", fieldInput)}
                    value={detail.parsedAddress1 ?? ""}
                    onChange={(e) => setDetail({ ...detail, parsedAddress1: e.target.value || null })}
                  />
                </div>
                <div>
                  <Label className={reviewFormLabel}>City / State / ZIP</Label>
                  <div className="mt-1 grid grid-cols-3 gap-3">
                    <Input
                      className={fieldInput}
                      placeholder="City"
                      value={detail.parsedCity ?? ""}
                      onChange={(e) => setDetail({ ...detail, parsedCity: e.target.value || null })}
                    />
                    <Input
                      className={fieldInput}
                      placeholder="ST"
                      value={detail.parsedState ?? ""}
                      onChange={(e) => setDetail({ ...detail, parsedState: e.target.value || null })}
                    />
                    <Input
                      className={fieldInput}
                      placeholder="ZIP"
                      value={detail.parsedZip ?? ""}
                      onChange={(e) => setDetail({ ...detail, parsedZip: e.target.value || null })}
                    />
                  </div>
                </div>
                <div>
                  <Label className={reviewFormLabel}>Parsed scheduled at</Label>
                  <Input
                    className={cn("mt-1", fieldInput)}
                    type="datetime-local"
                    value={
                      detail.parsedScheduledAt
                        ? new Date(detail.parsedScheduledAt).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      setDetail({
                        ...detail,
                        parsedScheduledAt: e.target.value ? new Date(e.target.value) : null,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className={reviewFormLabel}>Event kind / status</Label>
                  <div className="mt-1 grid grid-cols-2 gap-3">
                    <Input
                      className={fieldInput}
                      placeholder="Event kind"
                      value={detail.parsedEventKind ?? ""}
                      onChange={(e) => setDetail({ ...detail, parsedEventKind: e.target.value || null })}
                    />
                    <Input
                      className={fieldInput}
                      placeholder="Status"
                      value={detail.parsedStatus ?? ""}
                      onChange={(e) => setDetail({ ...detail, parsedStatus: e.target.value || null })}
                    />
                  </div>
                </div>
                <div>
                  <Label className={reviewFormLabel}>Agent name</Label>
                  <Input
                    className={cn("mt-1", fieldInput)}
                    value={detail.parsedAgentName ?? ""}
                    onChange={(e) => setDetail({ ...detail, parsedAgentName: e.target.value || null })}
                  />
                </div>
                <div>
                  <Label className={reviewFormLabel}>Agent email</Label>
                  <Input
                    className={cn("mt-1", fieldInput)}
                    value={detail.parsedAgentEmail ?? ""}
                    onChange={(e) => setDetail({ ...detail, parsedAgentEmail: e.target.value || null })}
                  />
                </div>
              </div>

              <h3 className={cn(reviewSectionTitle, "border-t border-kp-outline/60 pt-4")}>
                Subject, sender &amp; received
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className={reviewFormLabel}>Subject</Label>
                  <Input
                    className={cn("mt-1", fieldInput)}
                    value={detail.subject}
                    onChange={(e) => setDetail({ ...detail, subject: e.target.value })}
                  />
                </div>
                <div>
                  <Label className={reviewFormLabel}>Sender</Label>
                  <Input
                    className={cn("mt-1", fieldInput)}
                    value={detail.sender ?? ""}
                    onChange={(e) => setDetail({ ...detail, sender: e.target.value || null })}
                  />
                </div>
                <div>
                  <Label className={reviewFormLabel}>Received</Label>
                  <Input
                    className={cn("mt-1", fieldInput)}
                    type="datetime-local"
                    value={
                      detail.receivedAt
                        ? new Date(detail.receivedAt).toISOString().slice(0, 16)
                        : ""
                    }
                    disabled
                  />
                  <p className={cn("mt-0.5", reviewModalFieldHint)}>Read-only in v1</p>
                </div>
                <div>
                  <Label className={reviewFormLabel}>External message id</Label>
                  <Input
                    className={cn("mt-1 font-mono text-xs", fieldInput)}
                    value={detail.externalMessageId}
                    readOnly
                  />
                </div>
              </div>

              <div className="space-y-1.5 border-t border-kp-outline/60 pt-4">
                <Label className={reviewFormLabel}>Raw source text</Label>
                <p className={reviewModalFieldHint}>
                  Collapsed preview (first lines). Expand to view or edit the full message.
                </p>
                {reviewRawExpanded ? (
                  <textarea
                    className={reviewRawBodyTextarea}
                    spellCheck={false}
                    value={detail.rawBodyText}
                    onChange={(e) => setDetail({ ...detail, rawBodyText: e.target.value })}
                  />
                ) : (
                  <div
                    className={cn(
                      reviewRawBodyChrome,
                      "max-h-[6.5rem] overflow-hidden whitespace-pre-wrap break-words"
                    )}
                  >
                    {detail.rawBodyText?.trim()
                      ? rawBodyLines(detail.rawBodyText)
                          .slice(0, 5)
                          .join("\n")
                      : "— No raw body —"}
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(supraBtnTertiary, "h-8 text-xs")}
                  onClick={() => setReviewRawExpanded((x) => !x)}
                >
                  {reviewRawExpanded ? "Collapse email" : "Show full email"}
                </Button>
              </div>
            </div>
              </div>

              {/* Right: parse → match → apply → advanced (sticky) */}
              <div className="min-w-0 space-y-4 md:sticky md:top-0 md:z-[1] md:max-h-[min(85vh,840px)] md:self-start md:overflow-y-auto md:pb-1 md:pr-0.5">
                <p className={reviewRightRailIntro}>Match · apply</p>

                {isLinkedEndOfShowingQueueRow(detail) && detail.matchedShowing ? (
                  <div
                    className="rounded-lg border border-emerald-500/50 bg-emerald-950/40 px-3 py-2.5 shadow-sm"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="text-sm font-semibold text-emerald-50">
                      Matched end-of-showing notification
                    </p>
                    <p className="mt-1.5 text-sm font-medium leading-snug text-emerald-100">
                      KeyPilot linked this email to your existing showing scheduled for{" "}
                      <span className="font-semibold tabular-nums text-emerald-50">
                        {new Date(detail.matchedShowing.scheduledAt).toLocaleString()}
                      </span>
                      . Nothing further is required for your calendar record—dismiss this row when you have finished
                      reviewing it. Apply is not used for linked end notices.
                    </p>
                  </div>
                ) : null}

                <section className="space-y-2" aria-label="Parser">
                  <p className={reviewRightRailStep}>Parse</p>
                  <div className={cn(reviewRightPanel, "space-y-3")}>
                    <div>
                      <p className={reviewRightFieldLabel}>Next step (parser)</p>
                      <p className={cn("mt-1", reviewRightInstruction)}>
                        {PROPOSED_ACTION_LABELS[detail.proposedAction]}
                      </p>
                      <p className={reviewRightCodeMeta}>{detail.proposedAction}</p>
                      {isLinkedEndOfShowingQueueRow(detail) ? (
                        <p className={cn("mt-2", reviewRightHelper)}>
                          The parser labels this as dismiss. Your queue row is already tied to the original showing
                          above—treat it as resolved from a data standpoint.
                        </p>
                      ) : null}
                    </div>
                    <div className="border-t border-kp-outline/55 pt-3">
                      <p className={reviewRightFieldLabel}>Parse risk</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusBadge variant={confidenceBadgeVariant(detail.parseConfidence)}>
                          {formatEnumLabel(detail.parseConfidence)}
                        </StatusBadge>
                      </div>
                      <p className={cn("mt-2", reviewRightHelper)}>
                        {CONFIDENCE_HINTS[detail.parseConfidence]}
                      </p>
                    </div>
                    {detail.queueState !== QueueStates.APPLIED &&
                    detail.queueState !== QueueStates.DISMISSED &&
                    detail.queueState !== QueueStates.DUPLICATE ? (
                      <div className="border-t border-kp-outline/55 pt-3">
                        <p className={reviewRightFieldLabel}>Supra parser (v1)</p>
                        <p className={cn("mt-1", reviewRightHelper)}>
                          Runs{" "}
                          <code className="rounded border border-kp-outline/70 bg-kp-surface-high px-1 py-px font-mono text-[11px] text-kp-on-surface">
                            parse-supra-email
                          </code>{" "}
                          on subject + body. Verify date, address, and intent before apply.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(supraBtnSecondary, "mt-2 h-8 w-full")}
                          disabled={parseDrafting || saving || applying}
                          onClick={handleParseDraft}
                        >
                          {parseDrafting ? "Parsing…" : "Run parser → fill draft"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="space-y-2" aria-label="Match">
                  <p className={reviewRightRailStep}>Match</p>
                  <div className={cn(reviewRightPanel, "space-y-3")}>
                    <p className="text-sm font-bold text-kp-on-surface">Property &amp; showing</p>
                    <p className={reviewRightHelper}>
                      Suggestions are hints — pick one or type IDs. New listing: leave property blank if apply creates
                      from parsed address.
                    </p>

              {detail.parsedAddress1?.trim() &&
              detail.parsedState?.trim() &&
              (detail.parsedCity?.trim() ||
                (detail.parsedZip?.replace(/\D/g, "").length ?? 0) >= 5) ? (
                <div
                  className={cn(
                    reviewRightSuggestPanel,
                    detail.parseConfidence === Confidences.LOW && "border-amber-500/40 ring-1 ring-amber-500/20"
                  )}
                >
                  <p className={reviewRightFieldLabel}>Suggested properties</p>
                  {propertySuggestLoading ? (
                    <p className={cn("mt-2", reviewRightHelper)}>Loading…</p>
                  ) : propertySuggestions.length === 0 ? (
                    <p className={cn("mt-2", reviewRightHelper)}>
                      No similar properties in your account (same city/state and/or state/ZIP). Use manual ID below or
                      create on apply.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {propertySuggestions.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            className={cn(
                              "w-full rounded-md border border-kp-outline/80 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-kp-surface",
                              detail.matchedPropertyId === s.id && "border-kp-teal/60 bg-kp-teal/10"
                            )}
                            onClick={() => selectPropertySuggestion(s)}
                          >
                            <span className="font-semibold text-kp-on-surface">
                              {s.address1}, {s.city}, {s.state} {s.zip}
                            </span>
                            <span className="ml-2 text-[12px] font-semibold uppercase text-kp-on-surface">
                              {propertyMatchKindLabel(s.matchKind)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              {detail.parsedScheduledAt &&
              (detail.matchedPropertyId?.trim() ||
                propertySuggestLoading ||
                propertySuggestions.length > 0) ? (
                <div
                  className={cn(
                    reviewRightSuggestPanel,
                    detail.parseConfidence === Confidences.LOW && "border-amber-500/40 ring-1 ring-amber-500/20"
                  )}
                >
                  <p className={reviewRightFieldLabel}>Possible showings (±4h)</p>
                  {detail.matchedPropertyId?.trim() ? (
                    <p className={cn("mt-1", reviewRightHelper)}>
                      Pick one to update, or clear to create a new showing on apply.
                    </p>
                  ) : (
                    <p className={cn("mt-1", reviewRightHelper)}>
                      From your top property suggestions — choosing a row links that property and showing. Or pick a
                      property above first.
                    </p>
                  )}
                  {showingSuggestLoading ? (
                    <p className={cn("mt-2", reviewRightHelper)}>Loading…</p>
                  ) : showingSuggestions.length === 0 ? (
                    <p className={cn("mt-2", reviewRightHelper)}>
                      {detail.matchedPropertyId?.trim()
                        ? "No showings in that window. Use manual ID or leave empty for a new showing."
                        : "No showings in that window for suggested properties. Link a property or use manual ID."}
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {showingSuggestions.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            className={cn(
                              "w-full rounded-md border border-kp-outline/80 px-2.5 py-1.5 text-left text-xs font-medium tabular-nums transition-colors hover:bg-kp-surface",
                              detail.matchedShowingId === s.id && "border-kp-teal/60 bg-kp-teal/10"
                            )}
                            onClick={() => selectShowingSuggestion(s)}
                          >
                            {showingSuggestMultiProperty ? (
                              <span className="mb-0.5 block truncate text-[12px] font-medium text-kp-on-surface">
                                {s.property.address1}, {s.property.city} {s.property.state}
                              </span>
                            ) : null}
                            <span className="text-kp-on-surface">
                              {new Date(s.scheduledAt).toLocaleString()}{" "}
                              <span className="text-kp-on-surface/92">(±{s.minutesDelta} min)</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(supraBtnTertiary, "mt-2 h-8 justify-start px-2 text-left text-xs")}
                    onClick={clearShowingMatch}
                  >
                    Clear showing match (create new showing on apply)
                  </Button>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label className={reviewRightFormLabel}>Matched property id</Label>
                  <Input
                    className={cn("mt-1 font-mono text-xs", fieldInput)}
                    value={detail.matchedPropertyId ?? ""}
                    placeholder="UUID"
                    onChange={(e) =>
                      setDetail({
                        ...detail,
                        matchedPropertyId: e.target.value.trim() || null,
                        matchedProperty: null,
                      })
                    }
                  />
                  {detail.matchedProperty ? (
                    <p className="mt-1 text-xs text-kp-on-surface">
                      {detail.matchedProperty.address1}, {detail.matchedProperty.city},{" "}
                      {detail.matchedProperty.state}
                      {detail.matchedProperty.zip ? ` ${detail.matchedProperty.zip}` : ""}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label className={reviewRightFormLabel}>Matched showing id</Label>
                  <Input
                    className={cn("mt-1 font-mono text-xs", fieldInput)}
                    value={detail.matchedShowingId ?? ""}
                    placeholder="UUID"
                    onChange={(e) =>
                      setDetail({
                        ...detail,
                        matchedShowingId: e.target.value.trim() || null,
                        matchedShowing: null,
                      })
                    }
                  />
                  {detail.matchedShowing ? (
                    <p className={cn("mt-1 text-xs", reviewRightHelper)}>
                      {new Date(detail.matchedShowing.scheduledAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label className={reviewRightFormLabel}>Property match status</Label>
                  <select
                    className={cn("mt-1", fieldInput)}
                    value={detail.propertyMatchStatus}
                    onChange={(e) =>
                      setDetail({
                        ...detail,
                        propertyMatchStatus: e.target.value as SupraPropertyMatchStatus,
                      })
                    }
                  >
                    {(Object.values(PropMatch) as SupraPropertyMatchStatus[]).map((v) => (
                      <option key={v} value={v}>
                        {formatEnumLabel(v)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className={reviewRightFormLabel}>Showing match status</Label>
                  <select
                    className={cn("mt-1", fieldInput)}
                    value={detail.showingMatchStatus}
                    onChange={(e) =>
                      setDetail({
                        ...detail,
                        showingMatchStatus: e.target.value as SupraShowingMatchStatus,
                      })
                    }
                  >
                    {(Object.values(ShowMatch) as SupraShowingMatchStatus[]).map((v) => (
                      <option key={v} value={v}>
                        {formatEnumLabel(v)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
                  </div>
                </section>

                <section className="space-y-2" aria-label="Apply to KeyPilot">
                  <p className={reviewRightRailStep}>Apply</p>
                  {detail && !TERMINAL_STATES.includes(detail.queueState) ? (
              <div className={reviewRightApplyShell}>
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-kp-on-surface">Apply to KeyPilot</p>
                    <p className={cn("mt-1.5", reviewRightHelper)}>
                      Creates a property if needed, then creates or updates a showing (source: Supra). The queue item
                      is marked applied.
                    </p>
                    {!applyReadiness.ok ? (
                      <ul className="mt-2 list-inside list-disc text-xs font-medium leading-snug text-kp-gold-bright">
                        {applyReadiness.reasons.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    ) : null}
                    {applyDuplicate && applyDuplicate.conflicts.length > 0 ? (
                      <div className="mt-2 rounded-md border-2 border-kp-outline/90 bg-kp-surface-high p-2.5 shadow-md">
                        <p className="text-sm font-bold text-kp-on-surface">
                          Duplicate check (±{applyDuplicate.context.windowHours}h)
                        </p>
                        <p className={cn("mt-1.5 leading-snug", reviewRightHelper)}>
                          You are applying{" "}
                          <span className="font-semibold text-kp-on-surface">
                            {new Date(applyDuplicate.context.parsedScheduledAt).toLocaleString()}
                          </span>
                          . Another showing on this listing falls in that window.
                        </p>
                        {applyDuplicate.serverGuidance ? (
                          <p className="mt-2 text-sm font-medium leading-relaxed text-kp-on-surface">
                            {applyDuplicate.serverGuidance}
                          </p>
                        ) : null}
                        <p className={cn("mt-2 leading-relaxed", reviewRightHelper)}>
                          {applyDuplicate.context.isUpdatingMatchedShowing
                            ? "Best next step: if one row below is the same appointment, link to it and apply again to update it. If you truly need two showings this close, confirm override."
                            : "Best next step: if one row below is this Supra email, link to it and apply again (updates that showing instead of creating a second). If this is a different appointment, confirm override or fix the parsed time."}
                        </p>
                        {applyDuplicate.context.property ? (
                          <p className="mt-2 text-sm font-medium text-kp-on-surface">
                            <span className="text-kp-on-surface">Property: </span>
                            {applyDuplicate.context.property.address1}, {applyDuplicate.context.property.city},{" "}
                            {applyDuplicate.context.property.state} {applyDuplicate.context.property.zip}
                          </p>
                        ) : detail.parsedAddress1?.trim() ? (
                          <p className="mt-2 text-sm font-medium text-kp-on-surface">
                            <span className="text-kp-on-surface">Parsed address: </span>
                            {detail.parsedAddress1}
                            {detail.parsedCity ? `, ${detail.parsedCity}` : ""}
                            {detail.parsedState ? `, ${detail.parsedState}` : ""}
                            {detail.parsedZip ? ` ${detail.parsedZip}` : ""}
                          </p>
                        ) : null}
                        <ul className="mt-2 space-y-2">
                          {applyDuplicate.conflicts.map((c) => (
                            <li
                              key={c.id}
                              className="rounded-md border border-kp-outline/80 bg-kp-surface-high/90 px-2 py-1.5"
                            >
                              <p className="text-xs font-semibold text-kp-on-surface">
                                {new Date(c.scheduledAt).toLocaleString()}
                                <span className="ml-1.5 font-normal text-kp-on-surface/92">
                                  ({c.minutesFromParsed === 0 ? "same time" : `±${c.minutesFromParsed} min`} vs parsed)
                                </span>
                              </p>
                              <p className="mt-0.5 font-mono text-[11px] text-kp-on-surface/92">{c.id}</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn(supraBtnSecondary, "mt-1.5 h-7 px-2 text-[11px]")}
                                disabled={Boolean(dupLinkShowingId) || applying}
                                onClick={() => void linkQueueToExistingShowing(c, applyDuplicate)}
                              >
                                {dupLinkShowingId === c.id ? "Linking…" : "Use this showing"}
                              </Button>
                            </li>
                          ))}
                        </ul>
                        <label className="mt-2.5 flex cursor-pointer items-start gap-2 text-kp-on-surface">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-kp-outline"
                            checked={applyDuplicateAck}
                            onChange={(e) => setApplyDuplicateAck(e.target.checked)}
                          />
                          <span className="text-xs leading-snug text-kp-on-surface/95">
                            Proceed anyway — this is a separate showing (or I accept updating/creating within ±
                            {applyDuplicate.context.windowHours}h).
                          </span>
                        </label>
                      </div>
                    ) : null}
                    {applyReadiness.ok && modalHasUnsavedEdits ? (
                      <p className={cn("mt-2 leading-snug", reviewRightGuidance)}>
                        Unsaved edits in this modal — <strong className="text-kp-on-surface">Save &amp; apply</strong>{" "}
                        will save to the server first, then run apply. Use <strong className="text-kp-on-surface">Save changes</strong>{" "}
                        alone if you only want to persist without applying.
                      </p>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(supraBtnPrimary, "mt-3 w-full border-transparent")}
                  disabled={
                    applying ||
                    !applyReadiness.ok ||
                    Boolean(applyDuplicate?.conflicts.length && !applyDuplicateAck)
                  }
                  title={
                    !applyReadiness.ok
                      ? "Fix the items above before applying."
                      : applyDuplicate?.conflicts.length && !applyDuplicateAck
                        ? "Use an existing showing, or check the box to proceed anyway."
                        : modalHasUnsavedEdits
                          ? "Saves your current modal edits, then applies using the saved row."
                          : undefined
                  }
                  onClick={handleApply}
                >
                  {applying
                    ? modalHasUnsavedEdits
                      ? "Save & apply…"
                      : "Applying…"
                    : modalHasUnsavedEdits
                      ? "Save & apply"
                      : "Apply now"}
                </Button>
              </div>
                  ) : (
                    <p className="rounded-md border border-kp-outline/90 bg-kp-surface-high px-2.5 py-2 text-xs font-medium leading-relaxed text-kp-on-surface/92">
                      Apply is not available for this queue state.
                    </p>
                  )}
                </section>

                <div className="rounded-lg border border-kp-outline bg-kp-surface-high/50">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-kp-surface-high/70"
                    onClick={() => setReviewAdvancedOpen((o) => !o)}
                    aria-expanded={reviewAdvancedOpen}
                  >
                    <span className={reviewRightAdvancedLabel}>
                      Advanced — queue &amp; routing
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-kp-on-surface/92 transition-transform",
                        reviewAdvancedOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {reviewAdvancedOpen ? (
                    <div className="space-y-2.5 border-t border-kp-outline/55 px-2.5 pb-3 pt-2.5">
                      <p className={reviewRightAdvancedIntro}>
                        Queue metadata overrides and internal notes — use when debugging or closing items.
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <Label className={reviewRightAdvancedLabel}>
                            Queue state
                          </Label>
                          <select
                            className={cn("mt-1", fieldInput)}
                            value={detail.queueState}
                            onChange={(e) =>
                              setDetail({ ...detail, queueState: e.target.value as SupraQueueState })
                            }
                          >
                            {(Object.values(QueueStates) as SupraQueueState[]).map((v) => (
                              <option key={v} value={v}>
                                {formatEnumLabel(v)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className={reviewRightAdvancedLabel}>
                            Parse confidence
                          </Label>
                          <select
                            className={cn("mt-1", fieldInput)}
                            value={detail.parseConfidence}
                            onChange={(e) =>
                              setDetail({
                                ...detail,
                                parseConfidence: e.target.value as SupraParseConfidence,
                              })
                            }
                          >
                            {(Object.values(Confidences) as SupraParseConfidence[]).map((v) => (
                              <option key={v} value={v}>
                                {formatEnumLabel(v)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className={reviewRightAdvancedLabel}>
                            Proposed action
                          </Label>
                          <select
                            className={cn("mt-1", fieldInput)}
                            value={detail.proposedAction}
                            onChange={(e) =>
                              setDetail({
                                ...detail,
                                proposedAction: e.target.value as SupraProposedAction,
                              })
                            }
                          >
                            {(Object.values(ProposedActions) as SupraProposedAction[]).map((v) => (
                              <option key={v} value={v}>
                                {PROPOSED_ACTION_LABELS[v]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <Label className={reviewRightAdvancedLabel}>
                          Resolution notes
                        </Label>
                        <textarea
                          className={cn("mt-1 min-h-[56px] text-xs", fieldTextarea)}
                          value={detail.resolutionNotes ?? ""}
                          onChange={(e) =>
                            setDetail({ ...detail, resolutionNotes: e.target.value || null })
                          }
                          placeholder="Optional notes for your team (dismissal reason, etc.)"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </BrandModal>

      <BrandModal
        open={pasteModalOpen}
        onOpenChange={(open) => {
          setPasteModalOpen(open);
          if (!open) {
            setPasteModalError(null);
            setPasteSplitDetected(null);
          }
        }}
        title="Paste email (manual test)"
        description="No mailbox connection — raw text only. Saving adds an Ingested row and opens Review so you can run the parser immediately."
        size="xl"
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p className={cn("order-2 max-w-md sm:order-1", t.meta)}>
              In the body field: <span className="font-medium text-kp-on-surface/88">⌘ Enter</span> (Mac) or{" "}
              <span className="font-medium text-kp-on-surface/88">Ctrl+Enter</span> (Windows) saves without clicking.
            </p>
            <div className="order-1 flex w-full flex-wrap justify-end gap-2 sm:order-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(supraBtnSecondary, "h-8")}
                disabled={pasting}
                onClick={() => setPasteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="supra-manual-paste-form"
                variant="outline"
                size="sm"
                className={cn(supraBtnPrimary, "h-8 border-transparent")}
                disabled={pasting || !pasteSubject.trim() || !pasteBody.trim()}
              >
                {pasting ? "Saving…" : "Add to queue & open review"}
              </Button>
            </div>
          </div>
        }
      >
        <form
          id="supra-manual-paste-form"
          className="flex max-h-[min(72vh,680px)] flex-col gap-3 overflow-y-auto pr-1"
          onSubmit={(e) => {
            e.preventDefault();
            void submitManualPaste();
          }}
        >
          <div className="rounded-lg border border-kp-teal/35 bg-kp-teal/[0.08] px-3 py-2.5">
            <p className={t.section}>Quick test loop</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-sm leading-snug text-kp-on-surface">
              <li>
                Paste a <strong className="text-kp-on-surface">full copied email</strong> into the box below (headers
                first) <em className="text-kp-on-surface/88">or</em> type subject + body separately.
              </li>
              <li>
                When headers are recognized, <strong className="text-kp-on-surface">Subject</strong>,{" "}
                <strong className="text-kp-on-surface">From</strong>, and{" "}
                <strong className="text-kp-on-surface">Received</strong> fill automatically — full text is still stored
                for the parser.
              </li>
              <li>
                <strong className="text-kp-on-surface">Add to queue</strong> — Ingested filter + Review opens.
              </li>
              <li>
                Run <strong className="text-kp-on-surface">parser</strong>, edit if needed, Save, then Apply when ready.
              </li>
            </ol>
          </div>

          {pasteModalError ? (
            <div
              className="rounded-md border border-red-500/40 bg-red-950/30 px-3 py-2 text-sm text-red-100"
              role="alert"
            >
              {pasteModalError}
            </div>
          ) : null}

          {pasteSplitDetected &&
          (pasteSplitDetected.subject || pasteSplitDetected.sender || pasteSplitDetected.receivedAt) ? (
            <div
              className="flex flex-wrap items-center gap-2 rounded-lg border border-kp-teal/40 bg-kp-teal/[0.1] px-3 py-2"
              role="status"
            >
              <span className="text-sm font-semibold text-kp-on-surface">Detected from paste:</span>
              <div className="flex flex-wrap gap-1.5">
                {pasteSplitDetected.subject ? (
                  <span className="rounded-md border border-kp-teal/35 bg-kp-surface-high px-2 py-0.5 text-xs font-medium text-kp-on-surface">
                    Subject
                  </span>
                ) : null}
                {pasteSplitDetected.sender ? (
                  <span className="rounded-md border border-kp-teal/35 bg-kp-surface-high px-2 py-0.5 text-xs font-medium text-kp-on-surface">
                    From (email)
                  </span>
                ) : null}
                {pasteSplitDetected.receivedAt ? (
                  <span className="rounded-md border border-kp-teal/35 bg-kp-surface-high px-2 py-0.5 text-xs font-medium text-kp-on-surface">
                    Date / Sent → Received
                  </span>
                ) : null}
              </div>
              <span className={cn("w-full text-xs sm:w-auto sm:pl-1", t.meta)}>
                Everything below is editable. Raw message field keeps the <strong>complete</strong> paste for parser
                testing.
              </span>
            </div>
          ) : null}

          <div>
            <Label className={t.label} htmlFor="supra-paste-subject">
              Subject
            </Label>
            <p className={cn("mt-0.5", t.metaQuiet)}>
              Required. Filled automatically when your paste includes a{" "}
              <code className="rounded bg-kp-surface-high px-1 font-mono text-[11px]">Subject:</code> line; otherwise
              type it here.
            </p>
            <Input
              id="supra-paste-subject"
              className={cn("mt-1", fieldInput)}
              value={pasteSubject}
              onChange={(e) => setPasteSubject(e.target.value)}
              placeholder="e.g. Showing confirmed: 123 Main St"
              autoComplete="off"
            />
          </div>

          <div className="rounded-lg border border-kp-outline/90 bg-kp-surface-high/80 p-2 shadow-sm">
            <Label className={t.label} htmlFor="supra-paste-body">
              Raw message for parser
            </Label>
            <p className={cn("mt-0.5", t.meta)}>
              Paste a <strong className="font-medium text-kp-on-surface">full email</strong> (Show original, Forward as
              plain text, etc.) or only the body. The entire field is saved as{" "}
              <code className="rounded bg-kp-surface px-1 font-mono text-[11px]">rawBodyText</code> — nothing is
              stripped at save time.
            </p>
            <textarea
              ref={pasteBodyRef}
              id="supra-paste-body"
              className={cn(
                "mt-2 min-h-[min(360px,42vh)] w-full resize-y rounded-md border border-kp-outline/90 bg-kp-bg px-3 py-2.5 font-mono text-[13px] leading-relaxed text-kp-on-surface shadow-inner",
                "placeholder:text-kp-on-surface-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kp-teal/40"
              )}
              spellCheck={false}
              value={pasteBody}
              onChange={(e) => {
                setPasteBody(e.target.value);
                if (!e.target.value.trim()) setPasteSplitDetected(null);
              }}
              onPaste={handlePasteEmailBlob}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void submitManualPaste();
                }
              }}
              placeholder="Paste the email here (plain text from Mail, Outlook, Gmail “Show original”, etc.)…"
            />
            <p className={cn("mt-1.5", t.metaQuiet)}>
              {pasteBody.length > 0
                ? `${pasteBody.length.toLocaleString()} characters — resize the corner to see more lines.`
                : "Tip: focus is here when this dialog opens so you can paste immediately."}
            </p>
          </div>

          <div>
            <p className={t.section}>Optional metadata</p>
            <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
              <div>
                <Label className={t.label} htmlFor="supra-paste-sender">
                  Sender
                </Label>
                <Input
                  id="supra-paste-sender"
                  className={cn("mt-1", fieldInput)}
                  value={pasteSender}
                  onChange={(e) => setPasteSender(e.target.value)}
                  placeholder="noreply@… (optional)"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label className={t.label} htmlFor="supra-paste-received">
                  Received at
                </Label>
                <Input
                  id="supra-paste-received"
                  className={cn("mt-1", fieldInput)}
                  type="datetime-local"
                  value={pasteReceivedAt}
                  onChange={(e) => setPasteReceivedAt(e.target.value)}
                />
                <p className={cn("mt-0.5", t.metaQuiet)}>Clear the field to use the current time when saving.</p>
              </div>
            </div>
          </div>
        </form>
      </BrandModal>
    </div>
  );
}

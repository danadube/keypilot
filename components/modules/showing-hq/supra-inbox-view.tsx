"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";
import {
  SupraQueueState as QueueStates,
  SupraParseConfidence as Confidences,
  SupraProposedAction as ProposedActions,
  SupraPropertyMatchStatus as PropMatch,
  SupraShowingMatchStatus as ShowMatch,
} from "@prisma/client";
import { AlertCircle, CheckCircle2, Inbox, ChevronDown, Sparkles } from "lucide-react";

function formatEnumLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

/** Human-readable proposed actions for reviewers */
const PROPOSED_ACTION_LABELS: Record<SupraProposedAction, string> = {
  UNKNOWN: "Unknown — decide manually",
  CREATE_SHOWING: "Create a new showing",
  UPDATE_SHOWING: "Update an existing showing",
  CREATE_PROPERTY_AND_SHOWING: "Create property + showing",
  DISMISS: "No action (dismiss)",
  NEEDS_MANUAL_REVIEW: "Needs manual review",
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

function rowAttentionClass(state: SupraQueueState): string {
  if (state === QueueStates.NEEDS_REVIEW) {
    return "border-l-[3px] border-l-kp-gold bg-kp-gold/[0.07]";
  }
  if (state === QueueStates.FAILED_PARSE) {
    return "border-l-[3px] border-l-red-500/70 bg-red-950/25";
  }
  if (state === QueueStates.READY_TO_APPLY) {
    return "border-l-[3px] border-l-kp-teal/60 bg-kp-teal/[0.06]";
  }
  return "";
}

const fieldInput =
  "border-kp-outline bg-kp-surface-high text-kp-on-surface placeholder:text-kp-on-surface/45";

/** Work-queue typography: readable primary + visible secondary (avoid muddy variant stacking) */
const t = {
  label: "text-sm font-medium text-kp-on-surface",
  section: "text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface/72",
  body: "text-sm leading-snug text-kp-on-surface",
  meta: "text-xs leading-snug text-kp-on-surface/78",
  metaQuiet: "text-[11px] leading-snug text-kp-on-surface/68",
  tableCell: "text-xs leading-tight text-kp-on-surface/88",
  tableMuted: "text-[11px] leading-tight text-kp-on-surface/65",
} as const;

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
  matchKind: "exact" | "partial";
};

/** Same rules as POST …/apply — for disabling the Apply button and list hints */
function getApplyReadiness(detail: ItemWithRelations | null): { ok: boolean; reasons: string[] } {
  if (!detail) return { ok: false, reasons: [] };
  if (TERMINAL_STATES.includes(detail.queueState)) {
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
    reasons.push("Link a matched property ID or fill address, city, state, and ZIP.");
  }
  if (!hasProp && detail.parseConfidence === Confidences.LOW) {
    reasons.push(
      "Parse confidence is low — link a matched property before applying, or raise confidence after verifying every parsed field."
    );
  }
  return { ok: reasons.length === 0, reasons };
}

type FilterPreset =
  | "all"
  | "ingested"
  | "needs_review"
  | "ready_to_apply"
  | "failed_parse"
  | "closed";

function normalizeItem(row: ItemWithRelations): ItemWithRelations {
  return {
    ...row,
    receivedAt: new Date(row.receivedAt),
    parsedScheduledAt: row.parsedScheduledAt ? new Date(row.parsedScheduledAt) : null,
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

export function SupraInboxView() {
  const [items, setItems] = useState<ItemWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filterPreset, setFilterPreset] = useState<FilterPreset>("all");
  const [detail, setDetail] = useState<ItemWithRelations | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [sampleMenuOpen, setSampleMenuOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyConflict, setApplyConflict] = useState<{ id: string; scheduledAt: string }[] | null>(
    null
  );
  const [applyDuplicateAck, setApplyDuplicateAck] = useState(false);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteSubject, setPasteSubject] = useState("");
  const [pasteBody, setPasteBody] = useState("");
  const [pasteSender, setPasteSender] = useState("");
  const [pasteReceivedAt, setPasteReceivedAt] = useState("");
  const [pasting, setPasting] = useState(false);
  const [parseDrafting, setParseDrafting] = useState(false);
  const [propertySuggestions, setPropertySuggestions] = useState<PropertySuggestionRow[]>([]);
  const [propertySuggestLoading, setPropertySuggestLoading] = useState(false);
  const [showingSuggestions, setShowingSuggestions] = useState<
    { id: string; scheduledAt: string; minutesDelta: number }[]
  >([]);
  const [showingSuggestLoading, setShowingSuggestLoading] = useState(false);

  const applyReadiness = useMemo(() => getApplyReadiness(detail), [detail]);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/v1/showing-hq/supra-queue");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error?.message ?? "Failed to load queue");
      setItems([]);
      return;
    }
    const raw = (json.data ?? []) as ItemWithRelations[];
    setItems(raw.map(normalizeItem));
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 5000);
    return () => clearTimeout(t);
  }, [successMessage]);

  /* Intentional deps: refetch when parsed address lines change, not on every detail field edit */
  useEffect(() => {
    if (!modalOpen || !detail) {
      setPropertySuggestions([]);
      return;
    }
    const a1 = detail.parsedAddress1?.trim();
    const city = detail.parsedCity?.trim();
    const st = detail.parsedState?.trim();
    if (!a1 || !city || !st) {
      setPropertySuggestions([]);
      return;
    }
    let cancelled = false;
    setPropertySuggestLoading(true);
    const q = new URLSearchParams({ address1: a1, city, state: st });
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
  }, [modalOpen, detail?.id, detail?.parsedAddress1, detail?.parsedCity, detail?.parsedState]);

  useEffect(() => {
    if (!modalOpen || !detail) {
      setShowingSuggestions([]);
      return;
    }
    const pid = detail.matchedPropertyId?.trim();
    const at = detail.parsedScheduledAt;
    if (!pid || !at) {
      setShowingSuggestions([]);
      return;
    }
    const t = new Date(at).getTime();
    if (Number.isNaN(t)) {
      setShowingSuggestions([]);
      return;
    }
    let cancelled = false;
    setShowingSuggestLoading(true);
    const q = new URLSearchParams({
      propertyId: pid,
      scheduledAt: new Date(at).toISOString(),
      windowHours: "3",
    });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only property + time drive showing hints
  }, [modalOpen, detail?.id, detail?.matchedPropertyId, detail?.parsedScheduledAt]);

  const counts = useMemo(() => {
    let ingested = 0;
    let needsReview = 0;
    let ready = 0;
    let failed = 0;
    let closed = 0;
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
    }
    return { ingested, needsReview, ready, failed, closed, total: items.length };
  }, [items]);

  const displayedItems = useMemo(() => {
    switch (filterPreset) {
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

  const openPasteModal = () => {
    setPasteSubject("");
    setPasteBody("");
    setPasteSender("");
    setPasteReceivedAt(new Date().toISOString().slice(0, 16));
    setPasteModalOpen(true);
  };

  const submitManualPaste = async () => {
    if (!pasteSubject.trim() || !pasteBody.trim()) {
      setError("Subject and email body are required.");
      return;
    }
    setPasting(true);
    setError(null);
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
      setPasteModalOpen(false);
      await load();
      setFilterPreset("all");
      setSuccessMessage(
        "Email saved as INGESTED (raw only). Open Review → Generate parsed draft or edit fields manually, then apply when ready."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Paste failed");
    } finally {
      setPasting(false);
    }
  };

  const openDetail = (row: ItemWithRelations) => {
    setApplyConflict(null);
    setApplyDuplicateAck(false);
    setDetail(normalizeItem(row));
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

  const selectShowingSuggestion = (s: { id: string; scheduledAt: string }) => {
    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        matchedShowingId: s.id,
        matchedShowing: {
          id: s.id,
          scheduledAt: new Date(s.scheduledAt),
          propertyId: prev.matchedPropertyId?.trim() ?? "",
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
    setError(null);
    try {
      const res = await fetch(`/api/v1/showing-hq/supra-queue/${detail.id}/parse-draft`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Parse draft failed");
      const row = json.data?.item as ItemWithRelations;
      if (row) setDetail(normalizeItem(row));
      await load();
      setSuccessMessage(
        typeof json.data?.message === "string"
          ? json.data.message
          : "Supra parser filled draft fields — review before apply."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parse draft failed");
    } finally {
      setParseDrafting(false);
    }
  };

  const handleApply = async () => {
    if (!detail || !applyReadiness.ok) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/showing-hq/supra-queue/${detail.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmDuplicateOverride: applyDuplicateAck }),
      });
      const json = await res.json();
      if (res.status === 409 && json.error?.code === "DUPLICATE_SHOWING_WINDOW") {
        setApplyConflict(json.conflicts ?? []);
        setError(json.error?.message ?? "Duplicate showing in time window.");
        return;
      }
      if (!res.ok) throw new Error(json.error?.message ?? "Apply failed");
      setApplyConflict(null);
      setApplyDuplicateAck(false);
      setModalOpen(false);
      setDetail(null);
      await load();
      const d = json.data as {
        createdProperty?: boolean;
        updatedShowing?: boolean;
      };
      const base = d?.updatedShowing
        ? "Applied: showing updated and queue item marked complete."
        : "Applied: new showing created (source: Supra).";
      setSuccessMessage(
        d?.createdProperty ? `${base} A new property was created from the parsed address.` : base
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setApplying(false);
    }
  };

  const patchItem = async (id: string, body: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/showing-hq/supra-queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Update failed");
      const updated = normalizeItem(json.data as ItemWithRelations);
      setApplyConflict(null);
      setApplyDuplicateAck(false);
      setDetail(updated);
      await load();
      if (TERMINAL_STATES.includes(updated.queueState)) {
        setModalOpen(false);
        setDetail(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDetail = async () => {
    if (!detail) return;
    await patchItem(detail.id, buildUpdatePayload(detail));
    setSuccessMessage("Review saved.");
  };

  const applyStateWithCurrentEdits = async (state: SupraQueueState) => {
    if (!detail) return;
    await patchItem(detail.id, { ...buildUpdatePayload(detail), queueState: state });
    setSuccessMessage(
      state === QueueStates.READY_TO_APPLY
        ? "Marked ready to apply (no showing created yet)."
        : state === QueueStates.FAILED_PARSE
          ? "Marked failed parse."
          : state === QueueStates.DISMISSED
            ? "Item dismissed."
            : state === QueueStates.DUPLICATE
              ? "Marked duplicate."
              : "Updated."
    );
  };

  type SampleKind = "typical" | "low_confidence" | "failed_parse" | "ready_to_apply";

  const addSampleRow = async (kind: SampleKind) => {
    setSeeding(true);
    setSampleMenuOpen(false);
    setError(null);
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
      setFilterPreset("all");
      setSuccessMessage(
        kind === "typical"
          ? "Sample row added (needs review). Open Review to edit or change state."
          : kind === "low_confidence"
            ? "Low-confidence sample added — good for testing corrections."
            : kind === "failed_parse"
              ? "Failed-parse sample added."
              : "Ready-to-apply sample added (still no auto-create)."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add sample");
    } finally {
      setSeeding(false);
    }
  };

  const parsedAddressLine = (row: ItemWithRelations) => {
    const parts = [
      row.parsedAddress1,
      [row.parsedCity, row.parsedState, row.parsedZip].filter(Boolean).join(", "),
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : "—";
  };

  const filterChip = (
    preset: FilterPreset,
    label: string,
    count?: number,
    activeClass?: string
  ) => (
    <Button
      type="button"
      variant={filterPreset === preset ? "default" : "outline"}
      size="sm"
      className={cn(
        filterPreset === preset
          ? activeClass ?? "bg-kp-teal text-kp-bg hover:bg-kp-teal/90"
          : "border-kp-outline text-kp-on-surface"
      )}
      onClick={() => setFilterPreset(preset)}
    >
      {label}
      {count !== undefined && count > 0 ? (
        <span className="ml-1.5 rounded-full bg-black/20 px-1.5 text-[10px] font-bold tabular-nums">
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
      {successMessage ? (
        <div
          className="flex items-center gap-2 rounded-lg border border-kp-teal/35 bg-kp-teal/[0.12] px-3 py-2 text-sm font-medium text-kp-on-surface"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-kp-teal" />
          {successMessage}
        </div>
      ) : null}

      {error ? (
        <ErrorMessage message={error} onRetry={() => load()} />
      ) : null}

      <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <p className={t.section}>Filter</p>
          <div className="flex flex-wrap gap-2">
            {filterChip("all", "All", counts.total)}
            {filterChip("ingested", "Ingested (raw)", counts.ingested)}
            {filterChip("needs_review", "Needs review", counts.needsReview, "bg-kp-gold/90 text-kp-bg hover:bg-kp-gold")}
            {filterChip("ready_to_apply", "Ready to apply", counts.ready)}
            {filterChip("failed_parse", "Failed parse", counts.failed, "bg-red-900/80 text-red-100 hover:bg-red-900")}
            {filterChip("closed", "Closed", counts.closed)}
          </div>
        </div>

        <div className="relative flex flex-col gap-1">
          <p className={t.section}>Test data</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-kp-teal/50 text-kp-teal hover:bg-kp-teal/10"
              disabled={pasting}
              onClick={openPasteModal}
            >
              Paste Supra email
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border border-dashed border-kp-outline text-kp-on-surface hover:bg-kp-surface-high"
              disabled={seeding}
              onClick={() => addSampleRow("typical")}
            >
              {seeding ? "Adding…" : "Quick sample"}
            </Button>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-kp-outline text-kp-on-surface hover:bg-kp-surface-high"
                disabled={seeding}
                onClick={() => setSampleMenuOpen((o) => !o)}
                aria-expanded={sampleMenuOpen}
                aria-haspopup="menu"
              >
                More samples
                <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
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
        </div>
      </div>

      <div className="rounded-xl border border-kp-outline/90 bg-kp-surface p-3 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04] sm:p-4">
        {displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-kp-outline bg-kp-surface-high text-kp-on-surface/70">
              <Inbox className="h-5 w-5" />
            </div>
            <p className="text-base font-semibold text-kp-on-surface">
              {items.length === 0 ? "No Supra queue items yet" : "Nothing in this filter"}
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-kp-on-surface/78">
              {items.length === 0 ? (
                <>
                  Mailbox ingestion is not connected. Use <strong>Quick sample</strong> or{" "}
                  <strong>More samples</strong> to add test rows, then open <strong>Review</strong> to walk
                  through the workflow.
                </>
              ) : (
                <>Try another filter, or clear filters to see all {items.length} item(s).</>
              )}
            </p>
            {items.length === 0 ? (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-kp-teal/50 text-kp-teal hover:bg-kp-teal/10"
                  disabled={pasting}
                  onClick={openPasteModal}
                >
                  Paste a real Supra email
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-kp-outline"
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
                className="mt-4 border-kp-outline"
                onClick={() => setFilterPreset("all")}
              >
                Show all
              </Button>
            )}
          </div>
        ) : (
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-kp-outline bg-kp-surface-high/50">
                  <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface/70">
                    Email
                  </th>
                  <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface/70">
                    In
                  </th>
                  <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface/70">
                    Address
                  </th>
                  <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface/70">
                    Showing
                  </th>
                  <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface/70">
                    Queue
                  </th>
                  <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface/70">
                    Risk
                  </th>
                  <th className="min-w-[9rem] px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface/70">
                    Next step
                  </th>
                  <th className="w-[1%] whitespace-nowrap px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface/70">
                    Open
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.map((row) => {
                  const rowApplyOk = getApplyReadiness(row).ok;
                  return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-kp-outline/80 transition-colors hover:bg-kp-surface-high/70",
                      rowAttentionClass(row.queueState)
                    )}
                  >
                    <td className="max-w-[min(280px,28vw)] px-2 py-1.5 align-top">
                      <div className="flex flex-col gap-1">
                        <span
                          className="line-clamp-2 text-sm font-semibold leading-snug text-kp-on-surface"
                          title={row.subject}
                        >
                          {row.subject}
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                          {row.externalMessageId.startsWith("manual-paste-") ? (
                            <span className="rounded border border-kp-teal/35 bg-kp-teal/10 px-1.5 py-px text-[10px] font-semibold text-kp-teal">
                              Pasted
                            </span>
                          ) : null}
                          {rowApplyOk ? (
                            <span className="inline-flex items-center gap-0.5 rounded border border-kp-teal/40 bg-kp-teal/10 px-1.5 py-px text-[10px] font-semibold text-kp-teal">
                              <Sparkles className="h-2.5 w-2.5 shrink-0" />
                              Apply OK
                            </span>
                          ) : null}
                          {isAwaitingDecision(row.queueState) &&
                          row.queueState !== QueueStates.READY_TO_APPLY &&
                          !rowApplyOk ? (
                            <span className="rounded border border-kp-gold/35 bg-kp-gold/10 px-1.5 py-px text-[10px] font-semibold text-kp-gold">
                              Needs you
                            </span>
                          ) : null}
                          {row.queueState === QueueStates.READY_TO_APPLY && !rowApplyOk ? (
                            <span className="rounded border border-amber-500/30 bg-amber-950/25 px-1.5 py-px text-[10px] font-semibold text-amber-200/90">
                              Fields incomplete
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className={cn("whitespace-nowrap px-2 py-1.5 align-top tabular-nums", t.tableCell)}>
                      {new Date(row.receivedAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td
                      className={cn("max-w-[200px] px-2 py-1.5 align-top", t.tableCell)}
                      title={parsedAddressLine(row)}
                    >
                      <span className="line-clamp-2">{parsedAddressLine(row)}</span>
                    </td>
                    <td className={cn("whitespace-nowrap px-2 py-1.5 align-top tabular-nums", t.tableCell)}>
                      {row.parsedScheduledAt
                        ? new Date(row.parsedScheduledAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <StatusBadge variant={queueStateBadgeVariant(row.queueState)} dot>
                        {formatEnumLabel(row.queueState)}
                      </StatusBadge>
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <div className="flex flex-col gap-0.5">
                        <StatusBadge variant={confidenceBadgeVariant(row.parseConfidence)}>
                          {formatEnumLabel(row.parseConfidence)}
                        </StatusBadge>
                        <span
                          className={cn("max-w-[8.5rem]", t.tableMuted)}
                          title={CONFIDENCE_HINTS[row.parseConfidence]}
                        >
                          {row.parseConfidence === Confidences.HIGH
                            ? "Trust parser"
                            : row.parseConfidence === Confidences.MEDIUM
                              ? "Double-check"
                              : "High risk"}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-[220px] px-2 py-1.5 align-top">
                      <span className="text-xs font-semibold leading-tight text-kp-on-surface">
                        {PROPOSED_ACTION_LABELS[row.proposedAction]}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 pr-1 text-right align-top">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 border-kp-outline/90 bg-kp-surface-high px-3 text-xs font-semibold text-kp-on-surface shadow-sm hover:bg-kp-surface-higher"
                        onClick={() => openDetail(row)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BrandModal
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) {
            setDetail(null);
            setApplyConflict(null);
            setApplyDuplicateAck(false);
          }
        }}
        title="Review queue item"
        description="Fix parsed fields if needed, Save, then Apply to write property + showing. Nothing commits until you apply."
        size="lg"
        footer={
          <div className="flex w-full flex-col gap-3">
            {detail && !TERMINAL_STATES.includes(detail.queueState) ? (
              <div className="rounded-lg border border-kp-teal/40 bg-kp-teal/[0.1] p-3 shadow-sm">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-kp-on-surface">Apply to KeyPilot</p>
                    <p className={cn("mt-1", t.meta)}>
                      Creates a property if needed, then creates or updates a showing (source: Supra). The queue
                      item is marked applied.
                    </p>
                    {!applyReadiness.ok ? (
                      <ul className="mt-2 list-inside list-disc text-xs font-medium leading-snug text-kp-gold-bright">
                        {applyReadiness.reasons.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    ) : null}
                    {applyConflict && applyConflict.length > 0 ? (
                      <div className="mt-2 rounded-md border border-kp-outline/90 bg-kp-surface-high p-2.5">
                        <p className="text-sm font-semibold text-kp-on-surface">Conflicting showings (±2h)</p>
                        <p className={cn("mt-0.5", t.metaQuiet)}>Another showing exists near this time.</p>
                        <ul className="mt-1.5 space-y-1 font-mono text-[11px] text-kp-on-surface/80">
                          {applyConflict.map((c) => (
                            <li key={c.id}>
                              {c.id.slice(0, 8)}… @ {new Date(c.scheduledAt).toLocaleString()}
                            </li>
                          ))}
                        </ul>
                        <label className="mt-2 flex cursor-pointer items-center gap-2 text-kp-on-surface">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-kp-outline"
                            checked={applyDuplicateAck}
                            onChange={(e) => setApplyDuplicateAck(e.target.checked)}
                          />
                          <span>I understand — apply anyway</span>
                        </label>
                      </div>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 w-full bg-kp-teal font-semibold text-kp-bg hover:bg-kp-teal/90 sm:w-auto"
                  disabled={
                    applying ||
                    !applyReadiness.ok ||
                    Boolean(applyConflict?.length && !applyDuplicateAck)
                  }
                  title={
                    !applyReadiness.ok
                      ? "Fix the items above before applying."
                      : applyConflict?.length && !applyDuplicateAck
                        ? "Confirm override when a duplicate exists."
                        : undefined
                  }
                  onClick={handleApply}
                >
                  {applying ? "Applying…" : "Apply now"}
                </Button>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 border-b border-kp-outline/80 pb-2.5">
              <span className={cn("w-full", t.section)}>Queue shortcuts (save first)</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-kp-teal/50 font-semibold text-kp-teal hover:bg-kp-teal/10"
                disabled={saving || !detail}
                onClick={() => applyStateWithCurrentEdits(QueueStates.READY_TO_APPLY)}
              >
                Mark ready to apply
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-kp-outline/90 font-medium"
                disabled={saving || !detail}
                onClick={() => applyStateWithCurrentEdits(QueueStates.NEEDS_REVIEW)}
              >
                Back to needs review
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-red-800/50 font-medium text-red-400 hover:bg-red-950/40"
                disabled={saving || !detail}
                onClick={() => applyStateWithCurrentEdits(QueueStates.FAILED_PARSE)}
              >
                Mark failed parse
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-kp-outline/90 font-medium"
                disabled={saving || !detail}
                onClick={() => applyStateWithCurrentEdits(QueueStates.DISMISSED)}
              >
                Dismiss
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-kp-outline/90 font-medium"
                disabled={saving || !detail}
                onClick={() => applyStateWithCurrentEdits(QueueStates.DUPLICATE)}
              >
                Mark duplicate
              </Button>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 font-medium"
                onClick={() => setModalOpen(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 bg-kp-gold font-semibold text-kp-bg hover:bg-kp-gold-bright"
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
          <div className="flex max-h-[min(78vh,640px)] flex-col gap-3 overflow-y-auto pr-1">
            {/* Decision banner */}
            <div
              className={cn(
                "rounded-lg border px-3 py-2",
                detail.queueState === QueueStates.FAILED_PARSE
                  ? "border-red-700/45 bg-red-950/35"
                  : detail.queueState === QueueStates.READY_TO_APPLY
                    ? "border-kp-teal/45 bg-kp-teal/[0.12]"
                    : isAwaitingDecision(detail.queueState)
                      ? "border-kp-gold/45 bg-kp-gold/[0.12]"
                      : "border-kp-outline bg-kp-surface-high"
              )}
            >
              <div className="flex flex-wrap items-start gap-2.5">
                {detail.queueState === QueueStates.FAILED_PARSE ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                ) : (
                  <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-kp-gold" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge variant={queueStateBadgeVariant(detail.queueState)} dot>
                      {formatEnumLabel(detail.queueState)}
                    </StatusBadge>
                  </div>
                  <p className={cn("mt-1.5", t.meta)}>
                    {detail.queueState === QueueStates.FAILED_PARSE
                      ? "Treat the body as unusable unless you fix it manually below."
                      : detail.queueState === QueueStates.READY_TO_APPLY
                        ? "Ready to apply — use Apply now in the footer to write property and showing."
                        : isAwaitingDecision(detail.queueState)
                          ? "This item is waiting for a human decision — edit fields, then save or use quick actions."
                          : "This item is closed in the queue."}
                  </p>
                </div>
              </div>
            </div>

            {/* Proposed action + confidence */}
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-lg border border-kp-outline/90 bg-kp-surface-high p-2.5 shadow-sm">
                <p className={t.section}>Next step (parser)</p>
                <p className="mt-1.5 text-base font-semibold leading-snug text-kp-on-surface">
                  {PROPOSED_ACTION_LABELS[detail.proposedAction]}
                </p>
                <p className={cn("mt-1 font-mono", t.metaQuiet)}>{detail.proposedAction}</p>
              </div>
              <div className="rounded-lg border border-kp-outline/90 bg-kp-surface-high p-2.5 shadow-sm">
                <p className={t.section}>Parse risk</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <StatusBadge variant={confidenceBadgeVariant(detail.parseConfidence)}>
                    {formatEnumLabel(detail.parseConfidence)}
                  </StatusBadge>
                </div>
                <p className={cn("mt-2 leading-snug", t.meta)}>
                  {CONFIDENCE_HINTS[detail.parseConfidence]}
                </p>
              </div>
            </div>

            {detail.queueState !== QueueStates.APPLIED &&
            detail.queueState !== QueueStates.DISMISSED &&
            detail.queueState !== QueueStates.DUPLICATE ? (
              <div className="rounded-lg border border-dashed border-kp-outline/80 bg-kp-surface-high/90 p-2.5">
                <p className={t.section}>Supra parser (v1)</p>
                <p className={cn("mt-1.5", t.meta)}>
                  Runs <code className="rounded bg-kp-surface px-1 py-px font-mono text-[11px]">parse-supra-email</code>{" "}
                  on subject + body. Verify date, address, and intent before apply.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-8 border-kp-outline/90 font-semibold text-kp-on-surface hover:bg-kp-surface"
                  disabled={parseDrafting || saving || applying}
                  onClick={handleParseDraft}
                >
                  {parseDrafting ? "Parsing…" : "Run parser → fill draft"}
                </Button>
              </div>
            ) : null}

            <div className="grid gap-2.5 sm:grid-cols-2">
              <div>
                <Label className={t.label}>Subject</Label>
                <Input
                  className={cn("mt-1", fieldInput)}
                  value={detail.subject}
                  onChange={(e) => setDetail({ ...detail, subject: e.target.value })}
                />
              </div>
              <div>
                <Label className={t.label}>Sender</Label>
                <Input
                  className={cn("mt-1", fieldInput)}
                  value={detail.sender ?? ""}
                  onChange={(e) => setDetail({ ...detail, sender: e.target.value || null })}
                />
              </div>
              <div>
                <Label className={t.label}>Received</Label>
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
                <p className={cn("mt-0.5", t.metaQuiet)}>Read-only in v1</p>
              </div>
              <div>
                <Label className={t.label}>External message id</Label>
                <Input className={cn("mt-1 font-mono text-xs", fieldInput)} value={detail.externalMessageId} readOnly />
              </div>
            </div>

            <div>
              <Label className={t.label}>Raw source text</Label>
              <p className={cn("mb-1", t.metaQuiet)}>
                Full message body as captured. Editable when the parser is wrong.
              </p>
              <textarea
                className={cn(
                  "min-h-[160px] w-full rounded-md px-2.5 py-2 font-mono text-xs leading-snug",
                  fieldInput
                )}
                spellCheck={false}
                value={detail.rawBodyText}
                onChange={(e) => setDetail({ ...detail, rawBodyText: e.target.value })}
              />
            </div>

            <div>
              <p className={cn("mb-2", t.section)}>Parsed fields</p>
              {detail.parseConfidence === Confidences.LOW ? (
                <div className="mb-2.5 rounded-md border border-amber-500/40 bg-amber-950/35 px-3 py-2 text-sm text-amber-50">
                  <span className="font-semibold">Low parse confidence.</span>{" "}
                  <span className="text-amber-50/90">
                    Treat address and time as drafts. Apply requires a linked property or higher confidence.
                  </span>
                </div>
              ) : null}
              {!detail.parsedAddress1?.trim() && !detail.matchedPropertyId?.trim() ? (
                <div className="mb-2.5 rounded-md border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm text-kp-on-surface/88">
                  No parsed street address — fill address or link a property before applying.
                </div>
              ) : null}
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div>
                  <Label className={t.label}>Address line 1</Label>
                  <Input
                    className={cn("mt-1", fieldInput)}
                    value={detail.parsedAddress1 ?? ""}
                    onChange={(e) => setDetail({ ...detail, parsedAddress1: e.target.value || null })}
                  />
                </div>
                <div>
                  <Label className={t.label}>City / State / ZIP</Label>
                  <div className="mt-1 grid grid-cols-3 gap-2">
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
                  <Label className={t.label}>Parsed scheduled at</Label>
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
                  <Label className={t.label}>Event kind / status</Label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
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
                  <Label className={t.label}>Agent name</Label>
                  <Input
                    className={cn("mt-1", fieldInput)}
                    value={detail.parsedAgentName ?? ""}
                    onChange={(e) => setDetail({ ...detail, parsedAgentName: e.target.value || null })}
                  />
                </div>
                <div>
                  <Label className={t.label}>Agent email</Label>
                  <Input
                    className={cn("mt-1", fieldInput)}
                    value={detail.parsedAgentEmail ?? ""}
                    onChange={(e) => setDetail({ ...detail, parsedAgentEmail: e.target.value || null })}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className={cn("mb-1.5", t.section)}>Property &amp; showing match</p>
              <p className={cn("mb-2.5", t.meta)}>
                Suggestions are hints only — choose one or type IDs. New listing: leave property blank if apply
                creates from parsed address.
              </p>

              {detail.parsedAddress1?.trim() &&
              detail.parsedCity?.trim() &&
              detail.parsedState?.trim() ? (
                <div
                  className={cn(
                    "mb-3 rounded-lg border border-kp-outline/90 bg-kp-surface-high p-2.5",
                    detail.parseConfidence === Confidences.LOW && "opacity-[0.92]"
                  )}
                >
                  <p className={t.section}>Suggested properties</p>
                  {propertySuggestLoading ? (
                    <p className={cn("mt-2", t.meta)}>Loading…</p>
                  ) : propertySuggestions.length === 0 ? (
                    <p className={cn("mt-2", t.meta)}>
                      No similar properties in your account (same city/state). Use manual ID below or create on
                      apply.
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
                            <span className="ml-2 text-[10px] font-semibold uppercase text-kp-on-surface/65">
                              {s.matchKind === "exact" ? "Exact" : "Partial"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              {detail.matchedPropertyId?.trim() && detail.parsedScheduledAt ? (
                <div
                  className={cn(
                    "mb-3 rounded-lg border border-kp-outline/90 bg-kp-surface-high p-2.5",
                    detail.parseConfidence === Confidences.LOW && "opacity-[0.92]"
                  )}
                >
                  <p className={t.section}>Possible showings (±3h)</p>
                  <p className={cn("mt-1", t.metaQuiet)}>
                    Pick one to update, or clear to create a new showing on apply.
                  </p>
                  {showingSuggestLoading ? (
                    <p className={cn("mt-2", t.meta)}>Loading…</p>
                  ) : showingSuggestions.length === 0 ? (
                    <p className={cn("mt-2", t.meta)}>
                      No showings in that window. Use manual ID or leave empty for a new showing.
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
                            {new Date(s.scheduledAt).toLocaleString()}{" "}
                            <span className="text-kp-on-surface/70">
                              (±{s.minutesDelta} min)
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
                    className="mt-2 h-8 px-2 text-xs font-medium text-kp-on-surface/80 hover:text-kp-on-surface"
                    onClick={clearShowingMatch}
                  >
                    Clear showing match (create new showing on apply)
                  </Button>
                </div>
              ) : null}

              <div className="grid gap-2.5 sm:grid-cols-2">
                <div>
                  <Label className={t.label}>Matched property id</Label>
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
                    <p className="mt-1 text-xs text-kp-on-surface/78">
                      {detail.matchedProperty.address1}, {detail.matchedProperty.city},{" "}
                      {detail.matchedProperty.state}
                      {detail.matchedProperty.zip ? ` ${detail.matchedProperty.zip}` : ""}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label className={t.label}>Matched showing id</Label>
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
                    <p className="mt-1 text-xs text-kp-on-surface/78">
                      {new Date(detail.matchedShowing.scheduledAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label className={t.label}>Property match status</Label>
                  <select
                    className={cn("mt-1 h-10 w-full rounded-md border px-2 text-sm", fieldInput)}
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
                  <Label className={t.label}>Showing match status</Label>
                  <select
                    className={cn("mt-1 h-10 w-full rounded-md border px-2 text-sm", fieldInput)}
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

            <div className="grid gap-2.5 sm:grid-cols-3">
              <div>
                <Label className={t.label}>Queue state</Label>
                <select
                  className={cn("mt-1 h-10 w-full rounded-md border px-2 text-sm", fieldInput)}
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
                <Label className={t.label}>Parse confidence</Label>
                <select
                  className={cn("mt-1 h-10 w-full rounded-md border px-2 text-sm", fieldInput)}
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
                <Label className={t.label}>Proposed action</Label>
                <select
                  className={cn("mt-1 h-10 w-full rounded-md border px-2 text-sm", fieldInput)}
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
              <Label className={t.label}>Resolution notes</Label>
              <textarea
                className={cn("mt-1 min-h-[72px] w-full rounded-md px-3 py-2 text-sm", fieldInput)}
                value={detail.resolutionNotes ?? ""}
                onChange={(e) => setDetail({ ...detail, resolutionNotes: e.target.value || null })}
                placeholder="Optional notes for your team (dismissal reason, etc.)"
              />
            </div>
          </div>
        ) : null}
      </BrandModal>

      <BrandModal
        open={pasteModalOpen}
        onOpenChange={setPasteModalOpen}
        title="Paste Supra email"
        description="Copy from your mail app into KeyPilot. Stored as raw text only (INGESTED). Use Generate parsed draft (Supra v1) or manual edits in Review, then Apply when ready. No Gmail API."
        size="lg"
        footer={
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pasting}
              onClick={() => setPasteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-kp-teal font-semibold text-kp-bg hover:bg-kp-teal/90"
              disabled={pasting || !pasteSubject.trim() || !pasteBody.trim()}
              onClick={submitManualPaste}
            >
              {pasting ? "Saving…" : "Add to queue"}
            </Button>
          </div>
        }
      >
        <div className="flex max-h-[min(70vh,520px)] flex-col gap-3 overflow-y-auto pr-1">
          <div>
            <Label className={t.label}>Subject</Label>
            <Input
              className={cn("mt-1", fieldInput)}
              value={pasteSubject}
              onChange={(e) => setPasteSubject(e.target.value)}
              placeholder="As shown in your inbox"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className={t.label}>Sender (optional)</Label>
              <Input
                className={cn("mt-1", fieldInput)}
                value={pasteSender}
                onChange={(e) => setPasteSender(e.target.value)}
                placeholder="From: address if you want it stored"
              />
            </div>
            <div>
              <Label className={t.label}>Received (optional)</Label>
              <Input
                className={cn("mt-1", fieldInput)}
                type="datetime-local"
                value={pasteReceivedAt}
                onChange={(e) => setPasteReceivedAt(e.target.value)}
              />
              <p className="mt-0.5 text-[10px] text-kp-on-surface/78">
                Clear to let the server use “now” when saving.
              </p>
            </div>
          </div>
          <div>
            <Label className={t.label}>Raw body</Label>
            <p className="mb-1 text-[10px] text-kp-on-surface/78">
              Paste the message body (you may include headers at the top — everything is kept for parser testing).
            </p>
            <textarea
              className={cn(
                "min-h-[260px] w-full rounded-md px-3 py-2 font-mono text-xs leading-relaxed",
                fieldInput
              )}
              spellCheck={false}
              value={pasteBody}
              onChange={(e) => setPasteBody(e.target.value)}
              placeholder="Paste email content here…"
            />
          </div>
        </div>
      </BrandModal>
    </div>
  );
}

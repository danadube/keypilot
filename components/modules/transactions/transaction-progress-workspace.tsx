"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Loader2,
  AlertCircle,
  ExternalLink,
  FileText,
  Layers,
  Link2,
  ListChecks,
  CalendarClock,
  ChevronDown,
  Upload,
  RefreshCw,
} from "lucide-react";
import { apiFetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import type { ComponentProps } from "react";
import {
  PIPELINE_STAGE_LABELS,
  PIPELINE_STAGE_ORDER,
  type DocumentStatus,
  type PipelineSide,
  type PipelineStageKey,
} from "@/lib/transactions/ca-pipeline-definitions";
import type { PipelineChecklistMetaV1 } from "@/lib/transactions/pipeline-checklist-metadata";
import {
  mergePipelineMeta,
  serializePipelineMeta,
  tryParsePipelineMeta,
} from "@/lib/transactions/pipeline-checklist-metadata";
import { tryParseFormEngineChecklistNotes } from "@/lib/transactions/form-engine-checklist-notes";
import type { TransactionRecordForPaperwork } from "@/lib/transactions/build-transaction-paperwork-context-from-record";
import { buildTransactionPaperworkContextFromRecord } from "@/lib/transactions/build-transaction-paperwork-context-from-record";
import { tryMvpTransactionPaperwork } from "@/lib/transactions/try-mvp-transaction-paperwork";
import type { SerializedTransactionPaperworkDocument } from "@/lib/transactions/serialize-transaction-paperwork-document";
import type {
  RequirementBucket,
  TransactionDocumentInstance,
  TransactionDocumentInstanceStatus,
} from "@/lib/forms-engine/types";

type ChecklistItem = {
  id: string;
  transactionId: string;
  title: string;
  isComplete: boolean;
  sortOrder: number;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type TxStatus =
  | "LEAD"
  | "UNDER_CONTRACT"
  | "IN_ESCROW"
  | "PENDING"
  | "CLOSED"
  | "FALLEN_APART";

const STATUS_LABELS: Record<TxStatus, string> = {
  LEAD: "Lead",
  UNDER_CONTRACT: "Under contract",
  IN_ESCROW: "In escrow",
  PENDING: "Pending",
  CLOSED: "Closed",
  FALLEN_APART: "Fallen apart",
};

function statusBadgeVariant(
  s: TxStatus
): ComponentProps<typeof StatusBadge>["variant"] {
  switch (s) {
    case "LEAD":
      return "pending";
    case "PENDING":
      return "upcoming";
    case "UNDER_CONTRACT":
      return "sold";
    case "IN_ESCROW":
      return "live";
    case "CLOSED":
      return "closed";
    case "FALLEN_APART":
      return "cancelled";
  }
}

const DOC_STATUS_OPTIONS: { value: DocumentStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "sent", label: "Sent" },
  { value: "signed", label: "Signed" },
  { value: "uploaded", label: "Uploaded" },
  { value: "complete", label: "Complete" },
];

/** Opt-in via `.env.local`: `NEXT_PUBLIC_KEYPILOT_TXN_LEGACY_CHECKLIST=1` */
const SHOW_LEGACY_CHECKLIST =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_KEYPILOT_TXN_LEGACY_CHECKLIST === "1";

/** Focus stage control — must read as clearly interactive (not disabled). */
const FOCUS_STAGE_SELECT_TRIGGER_CLASS =
  "h-8 border-2 border-kp-teal/50 bg-kp-surface-high text-sm font-semibold text-kp-on-surface shadow-sm hover:border-kp-teal hover:bg-kp-surface-high [&>span]:text-kp-on-surface data-[placeholder]:text-kp-on-surface-variant focus-visible:ring-2 focus-visible:ring-kp-teal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-kp-surface";

function docStatusForScan(s: DocumentStatus): {
  label: string;
  variant: ComponentProps<typeof StatusBadge>["variant"];
} {
  switch (s) {
    case "not_started":
      return { label: "Not started", variant: "inactive" };
    case "sent":
      return { label: "Sent", variant: "pending" };
    case "signed":
      return { label: "Signed", variant: "upcoming" };
    case "uploaded":
      return { label: "Uploaded", variant: "live" };
    case "complete":
      return { label: "Complete", variant: "closed" };
  }
}

/** Scan-line due copy from saved row or local YYYY-MM-DD while editing. */
function dueScanLine(
  dueYmd: string,
  docStatus: DocumentStatus
): { text: string; warn: boolean } {
  if (docStatus === "complete") {
    return { text: "Complete — no action", warn: false };
  }
  const t = dueYmd.trim();
  if (!t) {
    return { text: "Due date not set", warn: false };
  }
  const d = new Date(`${t}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return { text: "Due date not set", warn: false };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(d);
  due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) {
    return { text: `Overdue ${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"}`, warn: true };
  }
  if (diff === 0) {
    return { text: "Due today", warn: true };
  }
  if (diff === 1) {
    return { text: "Due tomorrow", warn: false };
  }
  if (diff <= 7) {
    return {
      text: `Due in ${diff} days (${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`,
      warn: false,
    };
  }
  return { text: `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, warn: false };
}

function isDueDateOverdue(iso: string | null | undefined, docStatus: DocumentStatus): boolean {
  if (docStatus === "complete" || !iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

function isAbsoluteHttpUrl(s: string): boolean {
  const t = s.trim();
  if (!t.startsWith("http://") && !t.startsWith("https://")) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function humanizeStageHint(hint: string): string {
  if (hint === "general") return "Documents";
  return hint
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function instanceStatusToDocumentStatus(s: TransactionDocumentInstanceStatus): DocumentStatus {
  switch (s) {
    case "not_started":
      return "not_started";
    case "in_progress":
      return "sent";
    case "complete":
      return "complete";
    case "waived":
    case "not_applicable":
      return "complete";
    default:
      return "not_started";
  }
}

function paperworkRowHydration(
  instance: TransactionDocumentInstance,
  persisted: SerializedTransactionPaperworkDocument | undefined | null
): {
  docStatus: DocumentStatus;
  docUrl: string;
  comments: string;
  dueYmd: string;
} {
  if (!persisted) {
    return {
      docStatus: instanceStatusToDocumentStatus(instance.status),
      docUrl: "",
      comments: "",
      dueYmd: "",
    };
  }
  const urlOrPath =
    persisted.executedDocumentUrl?.trim() || persisted.executedDocumentFilePath?.trim() || "";
  return {
    docStatus: persisted.docStatus,
    docUrl: urlOrPath,
    comments: persisted.notes ?? "",
    dueYmd: persisted.dueDate ? persisted.dueDate.slice(0, 10) : "",
  };
}

function bucketLabel(bucket: RequirementBucket): string {
  switch (bucket) {
    case "required":
      return "Required";
    case "conditional":
      return "Conditional";
    case "optional":
      return "Optional";
    case "brokerage_required":
      return "Brokerage";
    case "compliance_only":
      return "Compliance";
    case "operational_task":
      return "Task";
    default:
      return bucket;
  }
}

function pipelinePositionHint(status: TxStatus, side: PipelineSide): string {
  if (status === "CLOSED" || status === "FALLEN_APART") {
    return "Transaction closed — documents below are historical.";
  }
  if (status === "IN_ESCROW") {
    return "Pipeline hint: you are likely in Escrow / Under Contract for document work.";
  }
  if (status === "UNDER_CONTRACT") {
    return side === "SELL"
      ? "Pipeline hint: likely Active Listing → Escrow for listing-side documents."
      : "Pipeline hint: likely Offer Submission → Escrow for buyer-side documents.";
  }
  return side === "SELL"
    ? "Pipeline hint: often Pre-Listing → Active Listing early in the deal."
    : "Pipeline hint: often Pre-Offer → Offer Submission early in the deal.";
}

function DealProgressStrip({
  complete,
  total,
  pct,
}: {
  complete: number;
  total: number;
  pct: number;
}) {
  const safePct = Math.min(100, Math.max(0, pct));
  return (
    <div className="mt-3 rounded-lg border border-kp-outline/40 bg-kp-bg/45 px-2.5 py-2" role="status">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface">
          Deal progress
        </span>
        <span className="text-xs tabular-nums text-kp-on-surface">
          {complete} of {total} complete · {safePct}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-kp-surface-high/90">
        <div
          className="h-full rounded-full bg-kp-teal/90 transition-[width] duration-300"
          style={{ width: `${safePct}%` }}
        />
      </div>
    </div>
  );
}

function WorkflowAttentionStrip({
  nextRequiredTitle,
  requiredNotStarted,
  overdueCount,
}: {
  nextRequiredTitle: string | null;
  requiredNotStarted: number;
  overdueCount: number;
}) {
  if (!nextRequiredTitle && requiredNotStarted === 0 && overdueCount === 0) return null;
  return (
    <div
      className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md border border-kp-teal/25 bg-kp-teal/[0.07] px-2.5 py-1.5 text-xs leading-snug text-kp-on-surface"
      role="status"
    >
      <span className="font-semibold text-kp-on-surface">Now</span>
      {nextRequiredTitle ? (
        <span>
          Next required: <span className="font-medium">{nextRequiredTitle}</span>
        </span>
      ) : null}
      {requiredNotStarted > 0 ? (
        <span className="text-kp-on-surface-variant">
          {nextRequiredTitle ? " · " : ""}
          {requiredNotStarted} required not started
        </span>
      ) : null}
      {overdueCount > 0 ? (
        <span className="font-semibold text-amber-700 dark:text-amber-300/95">
          {(nextRequiredTitle || requiredNotStarted > 0) ? " · " : ""}
          {overdueCount} overdue
        </span>
      ) : null}
    </div>
  );
}

function displayAttachmentLabel(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (t.startsWith("Local: ")) return t.slice(7);
  if (t.startsWith("attached:")) return t.slice("attached:".length);
  if (isAbsoluteHttpUrl(t)) {
    try {
      const u = new URL(t);
      const path = u.pathname.length > 32 ? `${u.pathname.slice(0, 32)}…` : u.pathname;
      return `${u.hostname.replace(/^www\./, "")}${path || ""}`;
    } catch {
      return "Link";
    }
  }
  const base = t.split(/[/\\]/).pop();
  return base || t;
}

export function TransactionProgressWorkspace({
  transactionId,
  stageStatus,
  side,
  propertyState,
  paperworkEnrichment,
  archived,
  onListsChanged,
  onTransactionRecordChanged,
  className,
}: {
  transactionId: string;
  stageStatus: TxStatus;
  side?: PipelineSide | null;
  /** Linked property state — drives jurisdiction-aware document requirements. */
  propertyState: string | null;
  /**
   * Optional fields from transaction + property + agent for `generateTransactionPaperwork`.
   * Omitted keys are not passed to the engine (defaults apply inside the builder).
   */
  paperworkEnrichment?: Pick<
    TransactionRecordForPaperwork,
    | "propertyType"
    | "yearBuilt"
    | "hasHoa"
    | "occupancyType"
    | "brokerageName"
    | "commissionInputs"
    | "agentUserId"
    | "agentDisplayName"
  >;
  archived: boolean;
  onListsChanged: () => void;
  /** After PATCH (e.g. side), parent should reload transaction JSON. */
  onTransactionRecordChanged?: () => void;
  className?: string;
}) {
  const checklistKey = transactionId ? `/api/v1/transactions/${transactionId}/checklist` : null;
  const { data: items, error, isLoading, mutate } = useSWR<ChecklistItem[]>(
    checklistKey,
    apiFetcher,
    { errorRetryCount: 2, errorRetryInterval: 500 }
  );

  const [seeding, setSeeding] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingSide, setSavingSide] = useState(false);
  const [stageJump, setStageJump] = useState<string>("");
  const [savingEngineSourceRuleId, setSavingEngineSourceRuleId] = useState<string | null>(null);

  const resolvedSide = side === "BUY" || side === "SELL" ? side : null;

  useEffect(() => {
    setStageJump("");
  }, [resolvedSide]);

  const paperworkCtx = useMemo(
    () =>
      resolvedSide
        ? buildTransactionPaperworkContextFromRecord({
            transactionId,
            propertyState,
            side: resolvedSide,
            ...paperworkEnrichment,
          })
        : null,
    [transactionId, resolvedSide, propertyState, paperworkEnrichment]
  );

  const engineTry = useMemo(() => {
    if (!paperworkCtx) return null;
    return tryMvpTransactionPaperwork(paperworkCtx);
  }, [paperworkCtx]);

  const useEnginePipeline = Boolean(engineTry?.ok);

  const paperworkKey =
    transactionId && resolvedSide && useEnginePipeline
      ? `/api/v1/transactions/${transactionId}/paperwork-documents`
      : null;
  const {
    data: paperworkRows,
    error: paperworkError,
    isLoading: paperworkLoading,
    mutate: mutatePaperwork,
  } = useSWR<SerializedTransactionPaperworkDocument[]>(paperworkKey, apiFetcher, {
    errorRetryCount: 2,
    errorRetryInterval: 500,
  });

  const busy =
    (isLoading && items === undefined) ||
    (Boolean(useEnginePipeline) && paperworkLoading && paperworkRows === undefined);

  const engineFallbackMessage = useMemo(() => {
    if (!paperworkCtx || !engineTry || useEnginePipeline) return null;
    if (engineTry.ok === false) {
      if (engineTry.reason === "no_jurisdiction" || engineTry.reason === "empty") {
        return "No forms template configured for this transaction — showing saved checklist rows only.";
      }
      return "Forms engine could not generate requirements — showing saved checklist rows only.";
    }
    return null;
  }, [paperworkCtx, engineTry, useEnginePipeline]);

  const jurisdictionLabel = useMemo(() => {
    if (engineTry?.ok) return engineTry.profile.displayName;
    if (paperworkCtx?.propertyState) return paperworkCtx.propertyState;
    return null;
  }, [engineTry, paperworkCtx]);

  const engineStageEntries = useMemo(() => {
    if (!engineTry?.ok) return [] as { stageKey: string; label: string; items: TransactionDocumentInstance[] }[];
    const map = new Map<string, TransactionDocumentInstance[]>();
    for (const inst of engineTry.instances) {
      const key = inst.stageHint ?? "general";
      const list = map.get(key) ?? [];
      list.push(inst);
      map.set(key, list);
    }
    const entries = Array.from(map.entries())
      .map(([stageKey, items]) => ({
        stageKey,
        label: humanizeStageHint(stageKey),
        items: items.slice().sort((a, b) => a.sortOrder - b.sortOrder),
      }))
      .sort((a, b) => {
        const minA = Math.min(...a.items.map((x) => x.sortOrder));
        const minB = Math.min(...b.items.map((x) => x.sortOrder));
        return minA - minB;
      });
    return entries;
  }, [engineTry]);

  const { pipelineRows, formEnginePersistedRows, legacyRows } = useMemo(() => {
    const rows = Array.isArray(items) ? items : [];
    const pipeline: ChecklistItem[] = [];
    const fe: ChecklistItem[] = [];
    const legacy: ChecklistItem[] = [];
    for (const r of rows) {
      if (tryParseFormEngineChecklistNotes(r.notes)) fe.push(r);
      else if (tryParsePipelineMeta(r.notes)) pipeline.push(r);
      else legacy.push(r);
    }
    return { pipelineRows: pipeline, formEnginePersistedRows: fe, legacyRows: legacy };
  }, [items]);

  const paperworkBySourceRuleId = useMemo(() => {
    const m = new Map<string, SerializedTransactionPaperworkDocument>();
    for (const row of paperworkRows ?? []) {
      m.set(row.sourceRuleId, row);
    }
    return m;
  }, [paperworkRows]);

  const byStage = useMemo(() => {
    const map = new Map<PipelineStageKey, ChecklistItem[]>();
    if (!resolvedSide) return map;
    for (const stage of PIPELINE_STAGE_ORDER[resolvedSide]) {
      map.set(stage, []);
    }
    for (const row of pipelineRows) {
      const m = tryParsePipelineMeta(row.notes);
      if (!m) continue;
      const list = map.get(m.stage) ?? [];
      list.push(row);
      map.set(m.stage, list);
    }
    return map;
  }, [pipelineRows, resolvedSide]);

  const pipelineActive = useMemo(() => {
    if (!resolvedSide) return false;
    if (useEnginePipeline && engineTry?.ok) return true;
    if (pipelineRows.length > 0) return true;
    return false;
  }, [resolvedSide, useEnginePipeline, engineTry, pipelineRows.length]);

  const progressStats = useMemo(() => {
    if (useEnginePipeline && engineTry?.ok) {
      const total = engineTry.instances.length;
      if (total === 0) return null;
      let complete = 0;
      for (const inst of engineTry.instances) {
        const row = paperworkBySourceRuleId.get(inst.sourceRuleId);
        const st = row?.docStatus ?? instanceStatusToDocumentStatus(inst.status);
        if (st === "complete") complete++;
      }
      return { complete, total, pct: Math.round((complete / total) * 100) };
    }
    if (resolvedSide && pipelineRows.length > 0) {
      let complete = 0;
      for (const row of pipelineRows) {
        const m = tryParsePipelineMeta(row.notes);
        if (m?.docStatus === "complete") complete++;
      }
      const total = pipelineRows.length;
      return { complete, total, pct: Math.round((complete / total) * 100) };
    }
    return null;
  }, [useEnginePipeline, engineTry, paperworkBySourceRuleId, resolvedSide, pipelineRows]);

  const workflowAttention = useMemo(() => {
    if (useEnginePipeline && engineTry?.ok) {
      const sorted = [...engineTry.instances].sort((a, b) => a.sortOrder - b.sortOrder);
      let nextRequiredTitle: string | null = null;
      let requiredNotStarted = 0;
      let overdueCount = 0;
      for (const inst of sorted) {
        const row = paperworkBySourceRuleId.get(inst.sourceRuleId);
        const st = row?.docStatus ?? instanceStatusToDocumentStatus(inst.status);
        const isReq = inst.bucket === "required" || inst.bucket === "brokerage_required";
        if (isReq && st === "not_started") requiredNotStarted++;
        if (row?.dueDate && st !== "complete" && isDueDateOverdue(row.dueDate, st)) {
          overdueCount++;
        }
        if (nextRequiredTitle === null && isReq && st !== "complete") {
          nextRequiredTitle = inst.title;
        }
      }
      return { nextRequiredTitle, requiredNotStarted, overdueCount };
    }
    if (resolvedSide && pipelineRows.length > 0) {
      const sorted = [...pipelineRows].sort((a, b) => a.sortOrder - b.sortOrder);
      let nextRequiredTitle: string | null = null;
      let requiredNotStarted = 0;
      let overdueCount = 0;
      for (const row of sorted) {
        const m = tryParsePipelineMeta(row.notes);
        if (!m) continue;
        const st = m.docStatus;
        const isReq = m.requirement === "required";
        if (isReq && st === "not_started") requiredNotStarted++;
        if (row.dueDate && st !== "complete" && isDueDateOverdue(row.dueDate, st)) {
          overdueCount++;
        }
        if (nextRequiredTitle === null && isReq && st !== "complete") {
          nextRequiredTitle = row.title;
        }
      }
      return { nextRequiredTitle, requiredNotStarted, overdueCount };
    }
    return null;
  }, [useEnginePipeline, engineTry, paperworkBySourceRuleId, resolvedSide, pipelineRows]);

  const canChangeSide =
    pipelineRows.length === 0 &&
    formEnginePersistedRows.length === 0 &&
    (paperworkRows?.length ?? 0) === 0 &&
    !useEnginePipeline;

  const saveSide = useCallback(
    async (next: PipelineSide) => {
      if (!canChangeSide || savingSide || archived) return;
      setSavingSide(true);
      try {
        const res = await fetch(`/api/v1/transactions/${transactionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ side: next }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error?.message ?? "Could not save side");
        toast.success(next === "SELL" ? "Set to listing side" : "Set to buyer side");
        onTransactionRecordChanged?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSavingSide(false);
      }
    },
    [canChangeSide, savingSide, archived, transactionId, onTransactionRecordChanged]
  );

  const seedPipeline = useCallback(async () => {
    if (!resolvedSide || seeding) return;
    setSeeding(true);
    try {
      const res = await fetch(`/api/v1/transactions/${transactionId}/checklist/seed-ca-pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side: resolvedSide }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message ?? "Could not seed pipeline");
      toast.success("California document pipeline loaded");
      await mutate();
      onListsChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  }, [resolvedSide, seeding, transactionId, mutate, onListsChanged]);

  const saveRow = useCallback(
    async (row: ChecklistItem, meta: PipelineChecklistMetaV1, extra: { dueDate: string | null }) => {
      setSavingId(row.id);
      try {
        const isComplete = meta.docStatus === "complete";
        const res = await fetch(`/api/v1/transactions/${transactionId}/checklist/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: serializePipelineMeta(meta),
            dueDate: extra.dueDate ? new Date(extra.dueDate + "T12:00:00").toISOString() : null,
            isComplete,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error?.message ?? "Save failed");
        toast.success("Saved");
        await mutate();
        onListsChanged();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSavingId(null);
      }
    },
    [transactionId, mutate, onListsChanged]
  );

  const saveEngineRow = useCallback(
    async (
      instance: TransactionDocumentInstance,
      persisted: SerializedTransactionPaperworkDocument | undefined,
      patch: { docStatus: DocumentStatus; dueYmd: string; docUrl: string; comments: string }
    ) => {
      if (archived) return;
      if (!persisted?.id) {
        toast.error("Document rows are still loading — try again in a moment.");
        return;
      }
      setSavingEngineSourceRuleId(instance.sourceRuleId);
      try {
        const trimmed = patch.docUrl.trim();
        const isHttp = trimmed.startsWith("http://") || trimmed.startsWith("https://");
        const res = await fetch(
          `/api/v1/transactions/${transactionId}/paperwork-documents/${persisted.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              docStatus: patch.docStatus,
              dueDate: patch.dueYmd.trim()
                ? new Date(`${patch.dueYmd.trim()}T12:00:00`).toISOString()
                : null,
              notes: patch.comments.trim() ? patch.comments.trim() : null,
              executedDocumentUrl: isHttp ? trimmed : null,
              executedDocumentFilePath: !isHttp && trimmed ? trimmed : null,
            }),
          }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error?.message ?? "Save failed");
        toast.success("Saved");
        await mutatePaperwork();
        onListsChanged();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSavingEngineSourceRuleId(null);
      }
    },
    [archived, transactionId, mutatePaperwork, onListsChanged]
  );

  return (
    <section
      className={cn(
        "rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm",
        className
      )}
      aria-labelledby="txn-pipeline-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-kp-outline/35 pb-3">
        <div className="flex min-w-0 items-start gap-2">
          <Layers className="mt-0.5 h-5 w-5 shrink-0 text-kp-teal" aria-hidden />
          <div>
            <h2 id="txn-pipeline-heading" className="text-base font-semibold text-kp-on-surface">
              Document workflow
            </h2>
            <p className="mt-0.5 max-w-prose text-[11px] leading-snug text-kp-on-surface-variant">
              Track documents by stage. Economics:{" "}
              <Link
                href={`/transactions/${transactionId}/financial`}
                className="font-medium text-kp-teal underline-offset-2 hover:underline"
              >
                Financial &amp; records
              </Link>
              .
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                Deal status
              </span>
              <StatusBadge variant={statusBadgeVariant(stageStatus)}>
                {STATUS_LABELS[stageStatus]}
              </StatusBadge>
            </div>
            {!pipelineActive ? (
              <p className="mt-1.5 text-[11px] text-kp-on-surface-variant">
                {pipelinePositionHint(stageStatus, resolvedSide ?? "SELL")}
              </p>
            ) : null}
          </div>
        </div>
        <ListChecks className="mt-1 h-4 w-4 shrink-0 text-kp-on-surface-muted opacity-70" aria-hidden />
      </div>

      {engineFallbackMessage ? (
        <div
          className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/[0.08] px-3 py-2 text-[11px] text-amber-950/90 dark:text-amber-100/90"
          role="status"
        >
          {engineFallbackMessage}
        </div>
      ) : null}

      {error || (useEnginePipeline && paperworkError) ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error instanceof Error
            ? error.message
            : paperworkError instanceof Error
              ? paperworkError.message
              : "Could not load documents"}
        </div>
      ) : (
        <>
          {!pipelineActive ? (
            <div
              id="txn-pipeline-setup"
              className="mt-4 rounded-lg border border-kp-outline/50 bg-kp-surface-high/30 px-3 py-3 sm:px-4"
            >
              <p className="text-xs font-semibold text-kp-on-surface">Pipeline setup</p>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-[11px] font-medium text-kp-on-surface">Representation</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={archived || savingSide || !canChangeSide}
                      className={cn(
                        "h-9 min-w-[7rem] border-kp-outline/80 text-xs font-medium",
                        resolvedSide === "SELL"
                          ? cn(kpBtnPrimary, "border-kp-teal/50 bg-kp-teal/20 text-kp-teal hover:bg-kp-teal/25")
                          : kpBtnSecondary
                      )}
                      onClick={() => void saveSide("SELL")}
                    >
                      {savingSide ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Listing (seller)"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={archived || savingSide || !canChangeSide}
                      className={cn(
                        "h-9 min-w-[7rem] border-kp-outline/80 text-xs font-medium",
                        resolvedSide === "BUY"
                          ? cn(kpBtnPrimary, "border-kp-teal/50 bg-kp-teal/20 text-kp-teal hover:bg-kp-teal/25")
                          : kpBtnSecondary
                      )}
                      onClick={() => void saveSide("BUY")}
                    >
                      {savingSide ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Buyer"}
                    </Button>
                  </div>
                  {!resolvedSide ? (
                    <p className="mt-1.5 text-[11px] text-kp-on-surface-variant">
                      Choose a side to load document requirements.
                    </p>
                  ) : !canChangeSide ? (
                    <p className="mt-1.5 text-[11px] text-kp-on-surface-variant">
                      Side stays fixed while document rows exist. Use a new transaction to switch.
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[11px] font-medium text-kp-teal">
                      {resolvedSide === "SELL" ? "Listing" : "Buyer"} — load checklist below.
                    </p>
                  )}
                </div>

                {resolvedSide ? (
                  <div className="border-t border-kp-outline/35 pt-3">
                    {useEnginePipeline && engineTry && engineTry.ok === false ? (
                      <p className="text-[11px] leading-snug text-kp-on-surface-variant">
                        Forms catalog did not load for this deal. Add property state where needed, or load the
                        California checklist.
                      </p>
                    ) : !paperworkCtx ? (
                      <p className="text-[11px] leading-snug text-kp-on-surface-variant">
                        Set a US state on the linked property for automated rows, or load the California
                        checklist.
                      </p>
                    ) : pipelineRows.length === 0 ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <p className="text-xs text-kp-on-surface">
                          Load{" "}
                          <span className="font-medium">
                            {resolvedSide === "SELL" ? "listing-side" : "buyer-side"}
                          </span>{" "}
                          CAR pipeline rows.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          disabled={archived || seeding || busy}
                          className={cn(
                            kpBtnPrimary,
                            "h-9 shrink-0 bg-kp-teal/25 text-xs font-semibold text-kp-teal hover:bg-kp-teal/35"
                          )}
                          onClick={() => void seedPipeline()}
                        >
                          {seeding ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <FileText className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                              Load checklist
                            </>
                          )}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <p className="mt-3 border-t border-kp-outline/35 pt-2 text-[10px] text-kp-on-surface-variant">
                Pricing &amp; splits:{" "}
                <Link
                  href={`/transactions/${transactionId}/financial`}
                  className="font-medium text-kp-teal underline-offset-2 hover:underline"
                >
                  Financial &amp; records
                </Link>
              </p>
            </div>
          ) : useEnginePipeline && engineTry?.ok ? (
            <div
              id="txn-pipeline-setup"
              className="mt-3 flex flex-col gap-2 rounded-md border border-kp-outline/45 bg-kp-surface-high/45 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <p className="min-w-0 text-sm font-semibold leading-tight text-kp-on-surface">
                Pipeline: {jurisdictionLabel ?? "California"}{" "}
                {resolvedSide === "SELL" ? "Listing" : "Buyer"} · {engineStageEntries.length} stages ·{" "}
                {engineTry.instances.length} docs
                {!canChangeSide ? (
                  <span className="font-normal text-kp-on-surface-variant"> · side locked</span>
                ) : null}
              </p>
              {engineStageEntries.length > 0 ? (
                <div className="w-full min-w-[12rem] max-w-[min(100%,280px)] space-y-0.5 sm:w-auto">
                  <label
                    htmlFor="txn-pipeline-stage-jump-engine"
                    className="text-[10px] font-bold uppercase tracking-wide text-kp-on-surface"
                  >
                    Focus stage
                  </label>
                  <Select
                    value={
                      stageJump && engineStageEntries.some((e) => e.stageKey === stageJump)
                        ? stageJump
                        : "__none__"
                    }
                    onValueChange={(v) => {
                      if (v === "__none__") {
                        setStageJump("");
                        return;
                      }
                      setStageJump(v);
                      requestAnimationFrame(() => {
                        const id = `txn-stage-${v.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
                        document.getElementById(id)?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      });
                    }}
                  >
                    <SelectTrigger
                      id="txn-pipeline-stage-jump-engine"
                      className={FOCUS_STAGE_SELECT_TRIGGER_CLASS}
                    >
                      <SelectValue placeholder="Jump to a stage…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="__none__"
                        className="text-xs text-kp-on-surface-variant focus:text-kp-on-surface"
                      >
                        Jump to a stage…
                      </SelectItem>
                      {engineStageEntries.map((e) => (
                        <SelectItem
                          key={e.stageKey}
                          value={e.stageKey}
                          className="text-xs text-kp-on-surface focus:text-kp-on-surface"
                        >
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          ) : pipelineRows.length > 0 && resolvedSide ? (
            <div
              id="txn-pipeline-setup"
              className="mt-3 flex flex-col gap-2 rounded-md border border-kp-outline/45 bg-kp-surface-high/45 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <p className="min-w-0 text-sm font-semibold leading-tight text-kp-on-surface">
                Pipeline: California {resolvedSide === "SELL" ? "Listing" : "Buyer"} ·{" "}
                {PIPELINE_STAGE_ORDER[resolvedSide].length} stages · {pipelineRows.length} docs
                {!canChangeSide ? (
                  <span className="font-normal text-kp-on-surface-variant"> · side locked</span>
                ) : null}
              </p>
              <div className="w-full min-w-[12rem] max-w-[min(100%,280px)] space-y-0.5 sm:w-auto">
                <label
                  htmlFor="txn-pipeline-stage-jump-ca"
                  className="text-[10px] font-bold uppercase tracking-wide text-kp-on-surface"
                >
                  Focus stage
                </label>
                <Select
                  value={
                    stageJump &&
                    PIPELINE_STAGE_ORDER[resolvedSide].includes(stageJump as PipelineStageKey)
                      ? stageJump
                      : "__none__"
                  }
                  onValueChange={(v) => {
                    if (v === "__none__") {
                      setStageJump("");
                      return;
                    }
                    setStageJump(v);
                    requestAnimationFrame(() => {
                      document.getElementById(`txn-stage-${v}`)?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    });
                  }}
                >
                  <SelectTrigger
                    id="txn-pipeline-stage-jump-ca"
                    className={FOCUS_STAGE_SELECT_TRIGGER_CLASS}
                  >
                    <SelectValue placeholder="Jump to a stage…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="__none__"
                      className="text-xs text-kp-on-surface-variant focus:text-kp-on-surface"
                    >
                      Jump to a stage…
                    </SelectItem>
                    {PIPELINE_STAGE_ORDER[resolvedSide].map((key) => (
                      <SelectItem
                        key={key}
                        value={key}
                        className="text-xs text-kp-on-surface focus:text-kp-on-surface"
                      >
                        {PIPELINE_STAGE_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {progressStats ? (
            <DealProgressStrip
              complete={progressStats.complete}
              total={progressStats.total}
              pct={progressStats.pct}
            />
          ) : null}

          {pipelineActive && workflowAttention && !busy ? (
            <WorkflowAttentionStrip
              nextRequiredTitle={workflowAttention.nextRequiredTitle}
              requiredNotStarted={workflowAttention.requiredNotStarted}
              overdueCount={workflowAttention.overdueCount}
            />
          ) : null}

          <div className="mt-3 space-y-3">
            {busy ? (
              <ul className="space-y-2" aria-busy="true">
                {[0, 1, 2, 3].map((i) => (
                  <li
                    key={i}
                    className="h-11 animate-pulse rounded-lg bg-kp-surface-high/40"
                    aria-hidden
                  />
                ))}
              </ul>
            ) : (
              <>
                {resolvedSide && useEnginePipeline && engineTry?.ok
                  ? engineStageEntries.map(({ stageKey, label, items }) => {
                      const safeId = stageKey.replace(/[^a-zA-Z0-9_-]/g, "_");
                      const openCount = items.filter((inst) => {
                        const row = paperworkBySourceRuleId.get(inst.sourceRuleId);
                        const st = row?.docStatus ?? instanceStatusToDocumentStatus(inst.status);
                        return st !== "complete";
                      }).length;
                      const stageIndex = engineStageEntries.findIndex((e) => e.stageKey === stageKey) + 1;
                      const stageTotal = engineStageEntries.length;
                      return (
                        <div key={stageKey} id={`txn-stage-${safeId}`} className="scroll-mt-28">
                          <div className="flex flex-wrap items-start justify-between gap-2 rounded-t-lg border border-b-0 border-kp-outline/50 bg-kp-surface-high/30 px-2.5 py-1.5 sm:px-3">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface">
                                Stage {stageIndex} of {stageTotal}
                              </p>
                              <h3 className="mt-0.5 text-sm font-semibold text-kp-on-surface">{label}</h3>
                            </div>
                            <span className="shrink-0 rounded-md bg-kp-surface/90 px-2 py-0.5 text-[11px] tabular-nums text-kp-on-surface">
                              {items.length - openCount} of {items.length} complete in stage · {openCount} open
                            </span>
                          </div>
                          <ul className="space-y-1 rounded-b-lg border border-t-0 border-kp-outline/50 bg-kp-surface/40 px-2 py-1.5 sm:px-2.5">
                            {items.map((inst) => (
                              <FormEngineDocumentRow
                                key={inst.sourceRuleId}
                                instance={inst}
                                persistedPaperwork={paperworkBySourceRuleId.get(inst.sourceRuleId)}
                                archived={archived}
                                disabled={savingEngineSourceRuleId === inst.sourceRuleId}
                                onSave={(patch) =>
                                  void saveEngineRow(
                                    inst,
                                    paperworkBySourceRuleId.get(inst.sourceRuleId),
                                    patch
                                  )
                                }
                              />
                            ))}
                          </ul>
                        </div>
                      );
                    })
                  : resolvedSide && pipelineRows.length > 0
                    ? PIPELINE_STAGE_ORDER[resolvedSide].map((stageKey) => {
                        const label = PIPELINE_STAGE_LABELS[stageKey];
                        const stageItems = byStage.get(stageKey) ?? [];
                        if (stageItems.length === 0) return null;
                        const openCount = stageItems.filter((r) => {
                          const m = tryParsePipelineMeta(r.notes);
                          return m && m.docStatus !== "complete";
                        }).length;
                        const stageIndex = PIPELINE_STAGE_ORDER[resolvedSide].indexOf(stageKey) + 1;
                        const stageTotal = PIPELINE_STAGE_ORDER[resolvedSide].length;
                        return (
                          <div key={stageKey} id={`txn-stage-${stageKey}`} className="scroll-mt-28">
                            <div className="flex flex-wrap items-start justify-between gap-2 rounded-t-lg border border-b-0 border-kp-outline/50 bg-kp-surface-high/30 px-2.5 py-1.5 sm:px-3">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface">
                                  Stage {stageIndex} of {stageTotal}
                                </p>
                                <h3 className="mt-0.5 text-sm font-semibold text-kp-on-surface">{label}</h3>
                              </div>
                              <span className="shrink-0 rounded-md bg-kp-surface/90 px-2 py-0.5 text-[11px] tabular-nums text-kp-on-surface">
                                {stageItems.length - openCount} of {stageItems.length} complete in stage ·{" "}
                                {openCount} open
                              </span>
                            </div>
                            <ul className="space-y-1 rounded-b-lg border border-t-0 border-kp-outline/50 bg-kp-surface/40 px-2 py-1.5 sm:px-2.5">
                              {stageItems
                                .slice()
                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                .map((row) => (
                                  <PipelineDocumentRow
                                    key={row.id}
                                    row={row}
                                    archived={archived}
                                    disabled={savingId === row.id}
                                    onSave={(meta, due) => {
                                      void saveRow(row, meta, { dueDate: due });
                                    }}
                                  />
                                ))}
                            </ul>
                          </div>
                        );
                      })
                    : null}

                {SHOW_LEGACY_CHECKLIST && legacyRows.length > 0 ? (
                  <div className="rounded-lg border border-dashed border-amber-500/30 bg-amber-500/[0.06] px-3 py-2.5">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface">
                      Legacy checklist (debug)
                    </h3>
                    <p className="mt-1 text-[10px] leading-snug text-kp-on-surface-variant">
                      Pre-pipeline rows — opt-in via{" "}
                      <code className="rounded bg-kp-surface-high/80 px-1 text-[10px]">
                        NEXT_PUBLIC_KEYPILOT_TXN_LEGACY_CHECKLIST=1
                      </code>
                      .
                    </p>
                    <ul className="mt-2 space-y-1">
                      {legacyRows.map((row) => (
                        <li
                          key={row.id}
                          className="rounded border border-kp-outline/20 bg-kp-surface/30 px-2 py-1.5 text-[11px] leading-snug text-kp-on-surface-variant"
                        >
                          {row.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function DocumentAttachField({
  value,
  onChange,
  disabled,
  idPrefix,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasPointer = Boolean(value.trim());
  const showOpen = isAbsoluteHttpUrl(value);
  const label = displayAttachmentLabel(value);

  const onPick = (file: File | undefined) => {
    if (!file) return;
    onChange(`Local: ${file.name}`);
  };

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-kp-on-surface">Attachment</p>
      {!hasPointer ? (
        <div
          className={cn(
            "flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-md border-2 border-dashed border-kp-teal/35 bg-kp-teal/[0.04] px-2.5 py-2 transition-colors",
            !disabled && "hover:border-kp-teal/60 hover:bg-kp-teal/[0.07]",
            disabled && "cursor-not-allowed opacity-55"
          )}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (disabled) return;
            onPick(e.dataTransfer.files?.[0]);
          }}
        >
          <Upload className="h-4 w-4 shrink-0 text-kp-teal" aria-hidden />
          <div className="min-w-0 flex-1 text-left">
            <p className="text-xs font-semibold text-kp-on-surface">Upload document</p>
            <p className="text-[10px] text-kp-on-surface-variant">or drop a file here</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
            disabled={disabled}
            onChange={(e) => onPick(e.target.files?.[0])}
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-kp-outline/55 bg-kp-surface-high/50 px-2 py-1.5">
          <FileText className="h-3.5 w-3.5 shrink-0 text-kp-teal" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-kp-on-surface" title={label}>
            {label}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {showOpen ? (
              <a
                href={value.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 items-center rounded border border-kp-teal/45 bg-kp-teal/12 px-2 text-[11px] font-semibold text-kp-teal hover:bg-kp-teal/20"
              >
                <ExternalLink className="mr-1 h-3 w-3" aria-hidden />
                View
              </a>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px] font-semibold text-kp-on-surface"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              <RefreshCw className="mr-1 h-3 w-3" aria-hidden />
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-1.5 text-[11px] font-medium text-kp-on-surface-variant hover:text-kp-on-surface"
              disabled={disabled}
              onClick={() => onChange("")}
            >
              Clear
            </Button>
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
              disabled={disabled}
              onChange={(e) => onPick(e.target.files?.[0])}
            />
          </div>
        </div>
      )}
      <details className="text-[10px] text-kp-on-surface-variant">
        <summary className="cursor-pointer select-none font-medium text-kp-on-surface-variant hover:text-kp-on-surface">
          Advanced: paste link or path
        </summary>
        <input
          id={`${idPrefix}-adv`}
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
          className="mt-1.5 h-8 w-full rounded border border-kp-outline/60 bg-kp-surface px-2 text-[11px] text-kp-on-surface"
        />
      </details>
    </div>
  );
}

function FormEngineDocumentRow({
  instance,
  persistedPaperwork,
  archived,
  disabled,
  onSave,
}: {
  instance: TransactionDocumentInstance;
  persistedPaperwork: SerializedTransactionPaperworkDocument | undefined;
  archived: boolean;
  disabled: boolean;
  onSave: (patch: {
    docStatus: DocumentStatus;
    dueYmd: string;
    docUrl: string;
    comments: string;
  }) => void | Promise<void>;
}) {
  const h0 = paperworkRowHydration(instance, persistedPaperwork);
  const [docStatus, setDocStatus] = useState<DocumentStatus>(h0.docStatus);
  const [docUrl, setDocUrl] = useState(h0.docUrl);
  const [comments, setComments] = useState(h0.comments);
  const [dueLocal, setDueLocal] = useState(h0.dueYmd);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const h = paperworkRowHydration(instance, persistedPaperwork);
    setDocStatus(h.docStatus);
    setDocUrl(h.docUrl);
    setComments(h.comments);
    setDueLocal(h.dueYmd);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- generator `instance` refs may change every render
  }, [
    instance.id,
    instance.status,
    instance.sourceRuleId,
    persistedPaperwork?.id,
    persistedPaperwork?.notes,
    persistedPaperwork?.dueDate,
    persistedPaperwork?.docStatus,
    persistedPaperwork?.executedDocumentUrl,
    persistedPaperwork?.executedDocumentFilePath,
  ]);

  const scan = docStatusForScan(docStatus);
  const dueLine = dueScanLine(dueLocal, docStatus);
  const hasFilePointer = Boolean(docUrl.trim());

  const bucket = instance.bucket;
  const leftAccent =
    bucket === "brokerage_required"
      ? "border-l-[3px] border-l-violet-500/80"
      : bucket === "compliance_only"
        ? "border-l-[3px] border-l-sky-500/80"
        : bucket === "operational_task"
          ? "border-l-[3px] border-l-kp-outline/80"
          : "border-l-[3px] border-l-transparent";

  return (
    <li
      className={cn(
        "overflow-hidden rounded-md border border-kp-outline/55 bg-kp-surface shadow-sm",
        leftAccent
      )}
    >
      <button
        type="button"
        className="flex w-full items-start gap-1.5 border-b border-kp-outline/35 bg-kp-surface-high/35 px-2 py-1.5 text-left sm:gap-2 sm:px-2.5"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <ChevronDown
          className={cn(
            "mt-0.5 h-3.5 w-3.5 shrink-0 text-kp-on-surface transition-transform",
            expanded && "rotate-180"
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight text-kp-on-surface">{instance.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0 text-[10px] text-kp-on-surface-variant">
            <span
              className={cn(
                "font-semibold uppercase tracking-wide",
                bucket === "required" || bucket === "brokerage_required"
                  ? "text-amber-800 dark:text-amber-200/95"
                  : "text-kp-teal"
              )}
            >
              {bucketLabel(bucket)}
            </span>
            <span className="text-kp-on-surface-variant/80" aria-hidden>
              ·
            </span>
            <span className="font-mono font-semibold text-kp-on-surface">{instance.shortCode}</span>
            {instance.providerId ? (
              <>
                <span className="text-kp-on-surface-variant/80">·</span>
                <span className="font-medium uppercase">{instance.providerId}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5 pl-0.5 text-right">
          <StatusBadge variant={scan.variant} dot>
            {scan.label}
          </StatusBadge>
          <span
            className={cn(
              "inline-flex max-w-[10rem] items-center gap-0.5 text-[10px] tabular-nums text-kp-on-surface-variant sm:max-w-[12rem]",
              dueLine.warn && "font-medium text-amber-600 dark:text-amber-300/90"
            )}
          >
            <CalendarClock className="h-3 w-3 shrink-0 opacity-85" aria-hidden />
            <span className="leading-tight">{dueLine.text}</span>
          </span>
          <span
            className={cn(
              "inline-flex max-w-[10rem] items-center gap-0.5 text-[10px] font-semibold leading-tight sm:max-w-[12rem]",
              hasFilePointer ? "text-kp-teal" : "text-kp-on-surface-variant"
            )}
          >
            <Link2 className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
            <span className="truncate">{hasFilePointer ? "Attached" : "No file"}</span>
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="space-y-2 border-t border-kp-outline/30 bg-kp-bg/20 px-2.5 py-2 sm:px-3">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-kp-outline/25 pb-2">
            <div>
              <p className="text-[13px] font-semibold text-kp-on-surface">{instance.title}</p>
              <p className="mt-0.5 text-[10px] text-kp-on-surface-variant">
                {bucketLabel(instance.bucket)} · {instance.shortCode}
                {instance.providerId ? ` · ${instance.providerId}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-right text-[10px]">
              <StatusBadge variant={scan.variant} dot>
                {scan.label}
              </StatusBadge>
              <span className={cn("text-kp-on-surface-variant", dueLine.warn && "font-medium text-amber-600")}>
                {dueLine.text}
              </span>
              <span className={cn("font-medium", hasFilePointer ? "text-kp-teal" : "text-kp-on-surface-variant")}>
                {hasFilePointer ? displayAttachmentLabel(docUrl) || "Attached" : "No attachment"}
              </span>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold uppercase text-kp-on-surface">Status</label>
              <Select
                value={docStatus}
                disabled={archived || disabled}
                onValueChange={(v) => setDocStatus(v as DocumentStatus)}
              >
                <SelectTrigger className="h-8 border-kp-outline/70 bg-kp-surface text-xs font-medium text-kp-on-surface [&>span]:text-kp-on-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_STATUS_OPTIONS.map((o) => (
                    <SelectItem
                      key={o.value}
                      value={o.value}
                      className="text-xs text-kp-on-surface focus:text-kp-on-surface"
                    >
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold uppercase text-kp-on-surface">Due date</label>
              <input
                type="date"
                value={dueLocal}
                disabled={archived || disabled}
                onChange={(e) => setDueLocal(e.target.value)}
                className="h-8 w-full rounded-md border border-kp-outline/70 bg-kp-surface px-2 text-xs text-kp-on-surface"
              />
            </div>
            <DocumentAttachField
              value={docUrl}
              onChange={setDocUrl}
              disabled={archived || disabled}
              idPrefix={`fe-${instance.sourceRuleId}`}
            />
            <div className="space-y-0.5 sm:col-span-2">
              <label className="text-[10px] font-bold uppercase text-kp-on-surface">Notes</label>
              <textarea
                value={comments}
                disabled={archived || disabled}
                onChange={(e) => setComments(e.target.value)}
                rows={2}
                placeholder="Short note…"
                className="min-h-[2.5rem] w-full resize-y rounded-md border border-kp-outline/70 bg-kp-surface px-2 py-1 text-xs leading-snug text-kp-on-surface"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              size="sm"
              disabled={archived || disabled}
              className={cn(kpBtnPrimary, "h-8 min-w-[5.5rem] px-4 text-xs font-semibold shadow-md")}
              onClick={() => {
                onSave({
                  docStatus,
                  dueYmd: dueLocal.trim(),
                  docUrl: docUrl.trim(),
                  comments: comments.trim(),
                });
              }}
            >
              {disabled ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function PipelineDocumentRow({
  row,
  archived,
  disabled,
  onSave,
}: {
  row: ChecklistItem;
  archived: boolean;
  disabled: boolean;
  onSave: (meta: PipelineChecklistMetaV1, dueDate: string | null) => void;
}) {
  const meta = tryParsePipelineMeta(row.notes);
  const [docStatus, setDocStatus] = useState<DocumentStatus>(meta?.docStatus ?? "not_started");
  const [docUrl, setDocUrl] = useState(meta?.docUrl ?? "");
  const [comments, setComments] = useState(meta?.comments ?? "");
  const [dueLocal, setDueLocal] = useState(
    row.dueDate ? row.dueDate.slice(0, 10) : ""
  );
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const m = tryParsePipelineMeta(row.notes);
    if (!m) return;
    const due = row.dueDate ? row.dueDate.slice(0, 10) : "";
    const url = m.docUrl ?? "";
    const c = m.comments ?? "";
    setDocStatus((prev) => (prev === m.docStatus ? prev : m.docStatus));
    setDocUrl((prev) => (prev === url ? prev : url));
    setComments((prev) => (prev === c ? prev : c));
    setDueLocal((prev) => (prev === due ? prev : due));
  }, [row.id, row.notes, row.dueDate]);

  if (!meta) return null;

  const scan = docStatusForScan(docStatus);
  const dueLine = dueScanLine(dueLocal, docStatus);
  const hasFilePointer = Boolean(docUrl.trim());

  return (
    <li className="overflow-hidden rounded-md border border-kp-outline/55 bg-kp-surface shadow-sm">
      <button
        type="button"
        className="flex w-full items-start gap-1.5 border-b border-kp-outline/35 bg-kp-surface-high/35 px-2 py-1.5 text-left sm:gap-2 sm:px-2.5"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <ChevronDown
          className={cn(
            "mt-0.5 h-3.5 w-3.5 shrink-0 text-kp-on-surface transition-transform",
            expanded && "rotate-180"
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight text-kp-on-surface">{row.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-kp-on-surface-variant">
            <span
              className={cn(
                "font-semibold uppercase tracking-wide",
                meta.requirement === "required"
                  ? "text-amber-800 dark:text-amber-200/95"
                  : "text-kp-teal"
              )}
            >
              {meta.requirement === "required" ? "Required" : "Conditional"}
            </span>
            <span className="text-kp-on-surface-variant/80">·</span>
            <span className="font-mono font-semibold text-kp-on-surface">{meta.code}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5 pl-0.5 text-right">
          <StatusBadge variant={scan.variant} dot>
            {scan.label}
          </StatusBadge>
          <span
            className={cn(
              "inline-flex max-w-[10rem] items-center gap-0.5 text-[10px] tabular-nums text-kp-on-surface-variant sm:max-w-[12rem]",
              dueLine.warn && "font-medium text-amber-600 dark:text-amber-300/90"
            )}
          >
            <CalendarClock className="h-3 w-3 shrink-0 opacity-85" aria-hidden />
            <span className="leading-tight">{dueLine.text}</span>
          </span>
          <span
            className={cn(
              "inline-flex max-w-[10rem] items-center gap-0.5 text-[10px] font-semibold leading-tight sm:max-w-[12rem]",
              hasFilePointer ? "text-kp-teal" : "text-kp-on-surface-variant"
            )}
          >
            <Link2 className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
            <span className="truncate">{hasFilePointer ? "Attached" : "No file"}</span>
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="space-y-2 border-t border-kp-outline/30 bg-kp-bg/20 px-2.5 py-2 sm:px-3">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-kp-outline/25 pb-2">
            <div>
              <p className="text-[13px] font-semibold text-kp-on-surface">{row.title}</p>
              <p className="mt-0.5 text-[10px] text-kp-on-surface-variant">
                {meta.requirement === "required" ? "Required" : "Conditional"} · {meta.code}
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-right text-[10px]">
              <StatusBadge variant={scan.variant} dot>
                {scan.label}
              </StatusBadge>
              <span className={cn("text-kp-on-surface-variant", dueLine.warn && "font-medium text-amber-600")}>
                {dueLine.text}
              </span>
              <span className={cn("font-medium", hasFilePointer ? "text-kp-teal" : "text-kp-on-surface-variant")}>
                {hasFilePointer ? displayAttachmentLabel(docUrl) || "Attached" : "No attachment"}
              </span>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold uppercase text-kp-on-surface">Status</label>
              <Select
                value={docStatus}
                disabled={archived || disabled}
                onValueChange={(v) => setDocStatus(v as DocumentStatus)}
              >
                <SelectTrigger className="h-8 border-kp-outline/70 bg-kp-surface text-xs font-medium text-kp-on-surface [&>span]:text-kp-on-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_STATUS_OPTIONS.map((o) => (
                    <SelectItem
                      key={o.value}
                      value={o.value}
                      className="text-xs text-kp-on-surface focus:text-kp-on-surface"
                    >
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold uppercase text-kp-on-surface">Due date</label>
              <input
                type="date"
                value={dueLocal}
                disabled={archived || disabled}
                onChange={(e) => setDueLocal(e.target.value)}
                className="h-8 w-full rounded-md border border-kp-outline/70 bg-kp-surface px-2 text-xs text-kp-on-surface"
              />
            </div>
            <DocumentAttachField
              value={docUrl}
              onChange={setDocUrl}
              disabled={archived || disabled}
              idPrefix={`pl-${row.id}`}
            />
            <div className="space-y-0.5 sm:col-span-2">
              <label className="text-[10px] font-bold uppercase text-kp-on-surface">Notes</label>
              <textarea
                value={comments}
                disabled={archived || disabled}
                onChange={(e) => setComments(e.target.value)}
                rows={2}
                placeholder="Short note…"
                className="min-h-[2.5rem] w-full resize-y rounded-md border border-kp-outline/70 bg-kp-surface px-2 py-1 text-xs leading-snug text-kp-on-surface"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              size="sm"
              disabled={archived || disabled}
              className={cn(kpBtnPrimary, "h-8 min-w-[5.5rem] px-4 text-xs font-semibold shadow-md")}
              onClick={() => {
                const next = mergePipelineMeta(meta, {
                  docStatus,
                  docUrl: docUrl.trim() || undefined,
                  comments: comments.trim() || undefined,
                });
                onSave(next, dueLocal.trim() || null);
              }}
            >
              {disabled ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

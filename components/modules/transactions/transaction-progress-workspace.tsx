"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Loader2,
  AlertCircle,
  ExternalLink,
  FileText,
  Layers,
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

export function TransactionProgressWorkspace({
  transactionId,
  stageStatus,
  side,
  archived,
  onListsChanged,
  onTransactionRecordChanged,
  className,
}: {
  transactionId: string;
  stageStatus: TxStatus;
  side?: PipelineSide | null;
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

  const busy = isLoading && items === undefined;
  const resolvedSide = side === "BUY" || side === "SELL" ? side : null;

  const { pipelineRows, legacyRows } = useMemo(() => {
    const rows = items ?? [];
    const pipeline: ChecklistItem[] = [];
    const legacy: ChecklistItem[] = [];
    for (const r of rows) {
      if (tryParsePipelineMeta(r.notes)) pipeline.push(r);
      else legacy.push(r);
    }
    return { pipelineRows: pipeline, legacyRows: legacy };
  }, [items]);

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

  const canChangeSide = pipelineRows.length === 0;

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

  return (
    <section
      className={cn(
        "rounded-xl border border-kp-outline bg-kp-surface p-5 shadow-sm",
        className
      )}
      aria-labelledby="txn-pipeline-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Layers className="mt-0.5 h-5 w-5 shrink-0 text-kp-teal" aria-hidden />
          <div>
            <h2 id="txn-pipeline-heading" className="text-base font-semibold text-kp-on-surface">
              Transaction documents &amp; stages
            </h2>
            <p className="mt-1 max-w-prose text-xs text-kp-on-surface-variant">
              Stage-based California workflow — concrete forms and packages per row. Choose representation
              below, load the pipeline, then track status, due dates, and executed file links here.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                Record status
              </span>
              <StatusBadge variant={statusBadgeVariant(stageStatus)}>
                {STATUS_LABELS[stageStatus]}
              </StatusBadge>
            </div>
            <p className="mt-2 text-[11px] text-kp-on-surface-variant">{pipelinePositionHint(stageStatus, resolvedSide ?? "SELL")}</p>
          </div>
        </div>
        <FileText className="h-4 w-4 text-kp-on-surface-muted opacity-50" aria-hidden />
      </div>

      {error ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error instanceof Error ? error.message : "Could not load checklist"}
        </div>
      ) : (
        <>
          <div
            id="txn-pipeline-setup"
            className="mt-5 rounded-lg border border-kp-teal/35 bg-kp-teal/[0.06] px-4 py-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
              Pipeline setup
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-xs font-medium text-kp-on-surface">Representation</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={archived || savingSide || !canChangeSide}
                    className={cn(
                      "h-9 border-kp-outline/80 text-xs",
                      resolvedSide === "SELL"
                        ? cn(kpBtnPrimary, "border-kp-teal/50 bg-kp-teal/20 text-kp-teal hover:bg-kp-teal/25")
                        : kpBtnSecondary
                    )}
                    onClick={() => void saveSide("SELL")}
                  >
                    {savingSide ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Listing"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={archived || savingSide || !canChangeSide}
                    className={cn(
                      "h-9 border-kp-outline/80 text-xs",
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
                  <p className="text-[11px] leading-snug text-kp-on-surface-variant">
                    Pick listing or buyer to unlock the California document list. You can change this until
                    the pipeline is loaded.
                  </p>
                ) : !canChangeSide ? (
                  <p className="text-[11px] leading-snug text-kp-on-surface-variant">
                    Side matches the loaded pipeline. To switch listing vs buyer, remove pipeline checklist
                    rows first (or start from a new transaction).
                  </p>
                ) : null}
              </div>

              {resolvedSide && pipelineRows.length > 0 ? (
                <div className="w-full min-w-[12rem] max-w-xs space-y-1 lg:w-auto">
                  <label
                    htmlFor="txn-pipeline-stage-jump"
                    className="text-[10px] font-semibold uppercase text-kp-on-surface-variant"
                  >
                    Focus stage
                  </label>
                  <Select
                    value={stageJump || "__none__"}
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
                      id="txn-pipeline-stage-jump"
                      className="h-9 border-kp-outline/70 bg-kp-surface text-xs"
                    >
                      <SelectValue placeholder="Jump to a stage…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-kp-on-surface-variant">
                        Jump to a stage…
                      </SelectItem>
                      {PIPELINE_STAGE_ORDER[resolvedSide].map((key) => (
                        <SelectItem key={key} value={key}>
                          {PIPELINE_STAGE_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {resolvedSide && pipelineRows.length === 0 ? (
                <div className="flex w-full flex-col gap-2 sm:max-w-md lg:ml-auto lg:w-auto lg:min-w-[14rem]">
                  <p className="text-xs text-kp-on-surface">
                    Load RLA, TDS, RPA, and the rest as individual rows for this{" "}
                    {resolvedSide === "SELL" ? "listing" : "buyer"} pipeline.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    disabled={archived || seeding || busy}
                    className={cn(
                      kpBtnPrimary,
                      "h-9 bg-kp-teal/25 text-xs font-semibold text-kp-teal hover:bg-kp-teal/35"
                    )}
                    onClick={() => void seedPipeline()}
                  >
                    {seeding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Load California document pipeline"
                    )}
                  </Button>
                </div>
              ) : null}
            </div>
            <p className="mt-3 border-t border-kp-outline/30 pt-3 text-[10px] text-kp-on-surface-variant">
              Pricing, net commission, CRM deal link, and splits:{" "}
              <Link
                href={`/transactions/${transactionId}/financial`}
                className="font-medium text-kp-teal underline-offset-2 hover:underline"
              >
                Financial &amp; records
              </Link>
            </p>
          </div>

          <div className="mt-6 space-y-6">
            {busy ? (
              <ul className="space-y-2" aria-busy="true">
                {[0, 1, 2, 3].map((i) => (
                  <li
                    key={i}
                    className="h-14 animate-pulse rounded-lg bg-kp-surface-high/40"
                    aria-hidden
                  />
                ))}
              </ul>
            ) : (
              <>
                {resolvedSide && pipelineRows.length > 0
                  ? PIPELINE_STAGE_ORDER[resolvedSide].map((stageKey) => {
                      const label = PIPELINE_STAGE_LABELS[stageKey];
                      const stageItems = byStage.get(stageKey) ?? [];
                      if (stageItems.length === 0) return null;
                      const openCount = stageItems.filter((r) => {
                        const m = tryParsePipelineMeta(r.notes);
                        return m && m.docStatus !== "complete";
                      }).length;
                      return (
                        <div key={stageKey} id={`txn-stage-${stageKey}`} className="scroll-mt-28">
                          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-kp-outline/50 pb-2">
                            <h3 className="text-sm font-semibold text-kp-on-surface">{label}</h3>
                            <span className="text-[11px] text-kp-on-surface-variant">
                              {openCount} open · {stageItems.length} total
                            </span>
                          </div>
                          <ul className="mt-3 space-y-3">
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

                {legacyRows.length > 0 ? (
                  <div className="rounded-lg border border-dashed border-kp-outline/40 bg-kp-surface-high/10 px-3 py-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                      Other items
                    </h3>
                    <p className="mt-1 text-[11px] text-kp-on-surface-variant">
                      Legacy or custom checklist rows — not part of the seeded pipeline.
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {legacyRows.map((row) => (
                        <li
                          key={row.id}
                          className="rounded-md border border-kp-outline/35 bg-kp-surface/50 px-2.5 py-1.5 text-xs text-kp-on-surface-muted"
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

  useEffect(() => {
    const m = tryParsePipelineMeta(row.notes);
    if (!m) return;
    setDocStatus(m.docStatus);
    setDocUrl(m.docUrl ?? "");
    setComments(m.comments ?? "");
    setDueLocal(row.dueDate ? row.dueDate.slice(0, 10) : "");
  }, [row.id, row.notes, row.dueDate]);

  if (!meta) return null;

  return (
    <li className="rounded-lg border border-kp-outline/60 bg-kp-surface/90 p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-kp-on-surface">{row.title}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                meta.requirement === "required"
                  ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                  : "bg-kp-teal/15 text-kp-teal"
              )}
            >
              {meta.requirement === "required" ? "Required" : "Conditional"}
            </span>
            <span className="rounded bg-kp-surface-high px-1.5 py-0.5 text-[10px] font-medium uppercase text-kp-on-surface-variant">
              {meta.code}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase text-kp-on-surface-variant">Status</label>
          <Select
            value={docStatus}
            disabled={archived || disabled}
            onValueChange={(v) => setDocStatus(v as DocumentStatus)}
          >
            <SelectTrigger className="h-9 border-kp-outline/70 bg-kp-surface text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOC_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase text-kp-on-surface-variant">Due date</label>
          <input
            type="date"
            value={dueLocal}
            disabled={archived || disabled}
            onChange={(e) => setDueLocal(e.target.value)}
            className="h-9 w-full rounded-md border border-kp-outline/70 bg-kp-surface px-2 text-xs text-kp-on-surface"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-[10px] font-semibold uppercase text-kp-on-surface-variant">
            Executed document (link or upload destination)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={docUrl}
              disabled={archived || disabled}
              onChange={(e) => setDocUrl(e.target.value)}
              placeholder="https://… or internal path"
              className="h-9 min-w-0 flex-1 rounded-md border border-kp-outline/70 bg-kp-surface px-2 text-xs text-kp-on-surface"
            />
            {isAbsoluteHttpUrl(docUrl) ? (
              <a
                href={docUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-kp-teal/40 bg-kp-teal/10 px-2.5 text-xs font-medium text-kp-teal hover:bg-kp-teal/20"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Open
              </a>
            ) : null}
          </div>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-[10px] font-semibold uppercase text-kp-on-surface-variant">Notes</label>
          <textarea
            value={comments}
            disabled={archived || disabled}
            onChange={(e) => setComments(e.target.value)}
            rows={2}
            placeholder="Counterparty, delivery method, exceptions…"
            className="w-full rounded-md border border-kp-outline/70 bg-kp-surface px-2 py-1.5 text-xs text-kp-on-surface"
          />
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={archived || disabled}
          className="h-8 text-xs"
          onClick={() => {
            const next = mergePipelineMeta(meta, {
              docStatus,
              docUrl: docUrl.trim() || undefined,
              comments: comments.trim() || undefined,
            });
            onSave(next, dueLocal.trim() || null);
          }}
        >
          {disabled ? "Saving…" : "Save row"}
        </Button>
      </div>
    </li>
  );
}

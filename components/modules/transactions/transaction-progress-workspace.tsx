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
  Link2,
  ListChecks,
  CalendarClock,
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

  useEffect(() => {
    setStageJump("");
  }, [resolvedSide]);

  const { pipelineRows, legacyRows } = useMemo(() => {
    const rows = Array.isArray(items) ? items : [];
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
              Documents by stage
            </h2>
            <p className="mt-1 max-w-prose text-xs text-kp-on-surface-variant">
              Work the deal in order: set representation, load the California checklist, then update each
              row as documents move. Economics stay on Financial &amp; records.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                Deal record status
              </span>
              <StatusBadge variant={statusBadgeVariant(stageStatus)}>
                {STATUS_LABELS[stageStatus]}
              </StatusBadge>
            </div>
            <p className="mt-2 text-[11px] text-kp-on-surface-variant">{pipelinePositionHint(stageStatus, resolvedSide ?? "SELL")}</p>
          </div>
        </div>
        <ListChecks className="h-4 w-4 shrink-0 text-kp-on-surface-muted opacity-60" aria-hidden />
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
            className="mt-5 overflow-hidden rounded-xl border border-kp-teal/30 bg-gradient-to-b from-kp-teal/[0.08] via-kp-surface/95 to-kp-surface shadow-sm"
          >
            <div className="border-b border-kp-outline/25 bg-kp-teal/[0.04] px-4 py-3 sm:px-5">
              <p className="text-xs font-semibold text-kp-on-surface">Pipeline workflow</p>
              <p className="mt-0.5 text-[11px] text-kp-on-surface-variant">
                Standard first steps for this transaction — same surface before and after rows load.
              </p>
            </div>

            <div className="space-y-0 px-4 py-4 sm:px-5">
              <div className="flex gap-3 sm:gap-4">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kp-teal/20 text-xs font-bold text-kp-teal"
                  aria-hidden
                >
                  1
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <h3 className="text-sm font-semibold text-kp-on-surface">Who are you representing?</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-kp-on-surface-variant">
                      Saved on the transaction. You can change this until the California checklist is loaded
                      for this deal.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={archived || savingSide || !canChangeSide}
                      className={cn(
                        "h-10 min-w-[7.5rem] border-kp-outline/80 text-xs font-medium",
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
                        "h-10 min-w-[7.5rem] border-kp-outline/80 text-xs font-medium",
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
                    <p className="text-[11px] text-kp-on-surface-variant">
                      Choose a side to unlock step 2.
                    </p>
                  ) : !canChangeSide ? (
                    <p className="text-[11px] text-kp-on-surface-variant">
                      Side is fixed while pipeline rows exist. Remove pipeline rows to switch, or use a new
                      transaction.
                    </p>
                  ) : (
                    <p className="text-[11px] font-medium text-kp-teal/90">
                      {resolvedSide === "SELL" ? "Listing" : "Buyer"} selected — continue to step 2.
                    </p>
                  )}
                </div>
              </div>

              {resolvedSide ? (
                <div className="mt-5 flex gap-3 border-t border-kp-outline/25 pt-5 sm:gap-4">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kp-teal/20 text-xs font-bold text-kp-teal"
                    aria-hidden
                  >
                    2
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-kp-on-surface">Load the California checklist</h3>
                      <p className="mt-1 text-[11px] leading-relaxed text-kp-on-surface-variant">
                        Adds CAR-style rows (RLA, TDS, RPA, etc.) as trackable items. You can still add custom
                        rows later; they appear below under &quot;Other checklist items.&quot;
                      </p>
                    </div>

                    {pipelineRows.length === 0 ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <p className="text-xs text-kp-on-surface">
                          Ready to create{" "}
                          <span className="font-medium">
                            {resolvedSide === "SELL" ? "listing-side" : "buyer-side"}
                          </span>{" "}
                          document rows.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          disabled={archived || seeding || busy}
                          className={cn(
                            kpBtnPrimary,
                            "h-10 shrink-0 bg-kp-teal/25 text-xs font-semibold text-kp-teal hover:bg-kp-teal/35"
                          )}
                          onClick={() => void seedPipeline()}
                        >
                          {seeding ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <FileText className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                              Load checklist rows
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                        <div className="rounded-lg border border-kp-teal/25 bg-kp-teal/[0.06] px-3 py-2">
                          <p className="text-[11px] font-semibold text-kp-on-surface">
                            Checklist active
                          </p>
                          <p className="text-[11px] text-kp-on-surface-variant">
                            {pipelineRows.length} pipeline row{pipelineRows.length === 1 ? "" : "s"} · jump to a
                            stage or scroll the list.
                          </p>
                        </div>
                        <div className="w-full min-w-[12rem] max-w-xs space-y-1 sm:w-auto">
                          <label
                            htmlFor="txn-pipeline-stage-jump"
                            className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-variant"
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
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-kp-outline/25 bg-kp-surface-high/20 px-4 py-2.5 sm:px-5">
              <p className="text-[10px] text-kp-on-surface-variant">
                Sale price, commissions, CRM deal, splits:{" "}
                <Link
                  href={`/transactions/${transactionId}/financial`}
                  className="font-medium text-kp-teal underline-offset-2 hover:underline"
                >
                  Financial &amp; records
                </Link>
              </p>
            </div>
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
                      const stageIndex = PIPELINE_STAGE_ORDER[resolvedSide].indexOf(stageKey) + 1;
                      const stageTotal = PIPELINE_STAGE_ORDER[resolvedSide].length;
                      return (
                        <div key={stageKey} id={`txn-stage-${stageKey}`} className="scroll-mt-28">
                          <div className="flex flex-wrap items-start justify-between gap-2 rounded-t-lg border border-b-0 border-kp-outline/50 bg-kp-surface-high/30 px-3 py-2.5 sm:px-4">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                                Stage {stageIndex} of {stageTotal}
                              </p>
                              <h3 className="mt-0.5 text-sm font-semibold text-kp-on-surface">{label}</h3>
                            </div>
                            <span className="shrink-0 rounded-md bg-kp-surface/80 px-2 py-1 text-[11px] tabular-nums text-kp-on-surface-variant">
                              {openCount} open · {stageItems.length} total
                            </span>
                          </div>
                          <ul className="space-y-2 rounded-b-lg border border-t-0 border-kp-outline/50 bg-kp-surface/40 px-3 py-3 sm:px-4">
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
                  <div className="rounded-lg border border-dashed border-kp-outline/25 bg-kp-bg/40 px-3 py-3 opacity-90">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-variant/90">
                      Other checklist items
                    </h3>
                    <p className="mt-1 text-[10px] leading-snug text-kp-on-surface-variant">
                      Custom or pre-pipeline rows — secondary to the California pipeline above. Manage in
                      your checklist tools or remove when obsolete.
                    </p>
                    <ul className="mt-2 space-y-1">
                      {legacyRows.map((row) => (
                        <li
                          key={row.id}
                          className="rounded border border-kp-outline/20 bg-kp-surface/30 px-2 py-1.5 text-[11px] leading-snug text-kp-on-surface-muted"
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
  const showOpenLink = isAbsoluteHttpUrl(docUrl);

  return (
    <li className="overflow-hidden rounded-lg border border-kp-outline/55 bg-kp-surface shadow-sm">
      <div className="border-b border-kp-outline/35 bg-kp-surface-high/35 px-3 py-2.5 sm:px-3.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-kp-on-surface">{row.title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  meta.requirement === "required"
                    ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                    : "bg-kp-teal/12 text-kp-teal"
                )}
              >
                {meta.requirement === "required" ? "Required" : "Conditional"}
              </span>
              <span className="rounded bg-kp-surface-high/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-kp-on-surface-variant">
                {meta.code}
              </span>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 sm:max-w-[min(100%,20rem)] sm:items-end">
            <StatusBadge variant={scan.variant} dot>
              {scan.label}
            </StatusBadge>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:justify-end">
              <span
                className={cn(
                  "inline-flex items-center gap-1 tabular-nums text-kp-on-surface-variant",
                  dueLine.warn && "font-medium text-amber-600 dark:text-amber-300/90"
                )}
              >
                <CalendarClock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                {dueLine.text}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  hasFilePointer ? "text-kp-teal" : "text-kp-on-surface-muted"
                )}
              >
                <Link2 className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                {hasFilePointer ? "File linked" : "No file linked"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 py-3 sm:px-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
          Update row
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
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
              Executed document (URL or path)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={docUrl}
                disabled={archived || disabled}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="https://… or drive path"
                className="h-9 min-w-0 flex-1 rounded-md border border-kp-outline/70 bg-kp-surface px-2 text-xs text-kp-on-surface"
              />
              {showOpenLink ? (
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
              placeholder="Counterparty, delivery method, version, exceptions…"
              className="w-full rounded-md border border-kp-outline/70 bg-kp-surface px-2 py-1.5 text-xs text-kp-on-surface"
            />
          </div>
        </div>

        <div className="mt-3 flex justify-end border-t border-kp-outline/25 pt-3">
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
      </div>
    </li>
  );
}

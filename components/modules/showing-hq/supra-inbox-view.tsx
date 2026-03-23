"use client";

import { useCallback, useEffect, useState } from "react";
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

function formatEnumLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
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

const fieldInput =
  "border-kp-outline bg-kp-surface-high text-kp-on-surface placeholder:text-kp-on-surface-variant";

type ItemWithRelations = SupraQueueItem & {
  matchedProperty: {
    id: string;
    address1: string;
    city: string;
    state: string;
  } | null;
  matchedShowing: { id: string; scheduledAt: Date } | null;
};

export function SupraInboxView() {
  const [items, setItems] = useState<ItemWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<SupraQueueState | "">("");
  const [detail, setDetail] = useState<ItemWithRelations | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const q = stateFilter ? `?state=${encodeURIComponent(stateFilter)}` : "";
    const res = await fetch(`/api/v1/showing-hq/supra-queue${q}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error?.message ?? "Failed to load queue");
      setItems([]);
      return;
    }
    setItems(json.data ?? []);
  }, [stateFilter]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const openDetail = (row: ItemWithRelations) => {
    setDetail(row);
    setModalOpen(true);
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
      setDetail(json.data);
      await load();
      if (
        json.data?.queueState === QueueStates.DISMISSED ||
        json.data?.queueState === QueueStates.DUPLICATE
      ) {
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
    await patchItem(detail.id, {
      subject: detail.subject,
      parsedAddress1: detail.parsedAddress1,
      parsedCity: detail.parsedCity,
      parsedState: detail.parsedState,
      parsedZip: detail.parsedZip,
      parsedScheduledAt: detail.parsedScheduledAt
        ? new Date(detail.parsedScheduledAt).toISOString()
        : null,
      parsedEventKind: detail.parsedEventKind,
      parsedStatus: detail.parsedStatus,
      parsedAgentName: detail.parsedAgentName,
      parsedAgentEmail: detail.parsedAgentEmail,
      parseConfidence: detail.parseConfidence,
      proposedAction: detail.proposedAction,
      propertyMatchStatus: detail.propertyMatchStatus,
      showingMatchStatus: detail.showingMatchStatus,
      matchedPropertyId: detail.matchedPropertyId?.trim() || null,
      matchedShowingId: detail.matchedShowingId?.trim() || null,
      resolutionNotes: detail.resolutionNotes,
      queueState: detail.queueState,
    });
  };

  const addSampleRow = async () => {
    setSeeding(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/showing-hq/supra-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalMessageId: `manual-test-${Date.now()}@keypilot.local`,
          subject: "Supra: Showing scheduled — 123 Main St",
          receivedAt: new Date().toISOString(),
          sender: "notifications@supra.example",
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
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed to add sample");
      await load();
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

  if (loading && items.length === 0) {
    return <PageLoading message="Loading Supra queue…" />;
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <ErrorMessage message={error} onRetry={() => load()} />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={stateFilter === "" ? "default" : "outline"}
            size="sm"
            className={cn(
              stateFilter === "" ? "bg-kp-teal text-kp-bg hover:bg-kp-teal/90" : "border-kp-outline"
            )}
            onClick={() => setStateFilter("")}
          >
            All
          </Button>
          {(Object.values(QueueStates) as SupraQueueState[]).map((s) => (
            <Button
              key={s}
              type="button"
              variant={stateFilter === s ? "default" : "outline"}
              size="sm"
              className={cn(
                stateFilter === s
                  ? "bg-kp-teal text-kp-bg hover:bg-kp-teal/90"
                  : "border-kp-outline text-kp-on-surface"
              )}
              onClick={() => setStateFilter(s)}
            >
              {formatEnumLabel(s)}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border border-dashed border-kp-outline text-kp-on-surface hover:bg-kp-surface-high"
          disabled={seeding}
          onClick={addSampleRow}
        >
          {seeding ? "Adding…" : "Add sample queue row"}
        </Button>
      </div>

      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-kp-on-surface">No queue items yet</p>
            <p className="mt-1 max-w-md text-xs text-kp-on-surface-variant">
              Ingestion is not connected. Use &quot;Add sample queue row&quot; to test the review UI, or wait
              for mailbox integration.
            </p>
          </div>
        ) : (
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-kp-outline">
                  <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Subject
                  </th>
                  <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Received
                  </th>
                  <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Parsed address
                  </th>
                  <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Scheduled
                  </th>
                  <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    State
                  </th>
                  <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Confidence
                  </th>
                  <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Proposed
                  </th>
                  <th className="w-[1%] whitespace-nowrap pb-2.5 pt-0.5 text-right text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Review
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kp-outline">
                {items.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-kp-surface-high">
                    <td className="max-w-[200px] truncate py-2.5 font-medium text-kp-on-surface" title={row.subject}>
                      {row.subject}
                    </td>
                    <td className="whitespace-nowrap py-2.5 text-kp-on-surface-variant">
                      {new Date(row.receivedAt).toLocaleString()}
                    </td>
                    <td className="max-w-[180px] truncate py-2.5 text-kp-on-surface-variant" title={parsedAddressLine(row)}>
                      {parsedAddressLine(row)}
                    </td>
                    <td className="whitespace-nowrap py-2.5 text-kp-on-surface-variant">
                      {row.parsedScheduledAt
                        ? new Date(row.parsedScheduledAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="py-2.5">
                      <StatusBadge variant={queueStateBadgeVariant(row.queueState)} dot>
                        {formatEnumLabel(row.queueState)}
                      </StatusBadge>
                    </td>
                    <td className="py-2.5">
                      <StatusBadge variant={confidenceBadgeVariant(row.parseConfidence)}>
                        {formatEnumLabel(row.parseConfidence)}
                      </StatusBadge>
                    </td>
                    <td className="py-2.5 text-xs text-kp-on-surface-variant">
                      {formatEnumLabel(row.proposedAction)}
                    </td>
                    <td className="py-2.5 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-higher"
                        onClick={() => openDetail(row)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BrandModal
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) setDetail(null);
        }}
        title="Review Supra item"
        description="Parsed fields are editable. No property or showing is created until a later apply step."
        size="lg"
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <div className="flex flex-wrap gap-2 sm:mr-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-kp-outline"
                disabled={saving}
                onClick={() => detail && patchItem(detail.id, { queueState: QueueStates.DISMISSED })}
              >
                Dismiss
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-kp-outline"
                disabled={saving}
                onClick={() => detail && patchItem(detail.id, { queueState: QueueStates.DUPLICATE })}
              >
                Mark duplicate
              </Button>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-kp-gold font-semibold text-kp-bg hover:bg-kp-gold-bright"
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
          <div className="flex max-h-[min(70vh,560px)] flex-col gap-4 overflow-y-auto pr-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-kp-on-surface">Subject</Label>
                <Input
                  className={cn("mt-1", fieldInput)}
                  value={detail.subject}
                  onChange={(e) => setDetail({ ...detail, subject: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-kp-on-surface">Sender</Label>
                <Input
                  className={cn("mt-1", fieldInput)}
                  value={detail.sender ?? ""}
                  onChange={(e) => setDetail({ ...detail, sender: e.target.value || null })}
                />
              </div>
              <div>
                <Label className="text-kp-on-surface">Received</Label>
                <Input
                  className={cn("mt-1", fieldInput)}
                  type="datetime-local"
                  value={
                    detail.receivedAt
                      ? new Date(detail.receivedAt).toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setDetail({
                      ...detail,
                      receivedAt: e.target.value ? new Date(e.target.value) : detail.receivedAt,
                    })
                  }
                  disabled
                />
                <p className="mt-0.5 text-[10px] text-kp-on-surface-variant">Read-only in v1</p>
              </div>
              <div>
                <Label className="text-kp-on-surface">External message id</Label>
                <Input className={cn("mt-1", fieldInput)} value={detail.externalMessageId} readOnly />
              </div>
            </div>

            <div>
              <Label className="text-kp-on-surface">Raw email body</Label>
              <textarea
                className={cn("mt-1 min-h-[120px] w-full rounded-md px-3 py-2 text-xs", fieldInput)}
                readOnly
                value={detail.rawBodyText}
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                Parsed proposal
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-kp-on-surface">Address line 1</Label>
                  <Input
                    className={cn("mt-1", fieldInput)}
                    value={detail.parsedAddress1 ?? ""}
                    onChange={(e) => setDetail({ ...detail, parsedAddress1: e.target.value || null })}
                  />
                </div>
                <div>
                  <Label className="text-kp-on-surface">City / State / ZIP</Label>
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
                  <Label className="text-kp-on-surface">Parsed scheduled at</Label>
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
                  <Label className="text-kp-on-surface">Event kind / status</Label>
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
                  <Label className="text-kp-on-surface">Agent name</Label>
                  <Input
                    className={cn("mt-1", fieldInput)}
                    value={detail.parsedAgentName ?? ""}
                    onChange={(e) => setDetail({ ...detail, parsedAgentName: e.target.value || null })}
                  />
                </div>
                <div>
                  <Label className="text-kp-on-surface">Agent email</Label>
                  <Input
                    className={cn("mt-1", fieldInput)}
                    value={detail.parsedAgentEmail ?? ""}
                    onChange={(e) => setDetail({ ...detail, parsedAgentEmail: e.target.value || null })}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                Matching (manual in v1)
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-kp-on-surface">Matched property id</Label>
                  <Input
                    className={cn("mt-1 font-mono text-xs", fieldInput)}
                    value={detail.matchedPropertyId ?? ""}
                    placeholder="UUID"
                    onChange={(e) =>
                      setDetail({ ...detail, matchedPropertyId: e.target.value.trim() || null })
                    }
                  />
                  {detail.matchedProperty ? (
                    <p className="mt-1 text-xs text-kp-on-surface-variant">
                      {detail.matchedProperty.address1}, {detail.matchedProperty.city}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label className="text-kp-on-surface">Matched showing id</Label>
                  <Input
                    className={cn("mt-1 font-mono text-xs", fieldInput)}
                    value={detail.matchedShowingId ?? ""}
                    placeholder="UUID"
                    onChange={(e) =>
                      setDetail({ ...detail, matchedShowingId: e.target.value.trim() || null })
                    }
                  />
                  {detail.matchedShowing ? (
                    <p className="mt-1 text-xs text-kp-on-surface-variant">
                      {new Date(detail.matchedShowing.scheduledAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label className="text-kp-on-surface">Property match status</Label>
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
                  <Label className="text-kp-on-surface">Showing match status</Label>
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

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-kp-on-surface">Queue state</Label>
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
                <Label className="text-kp-on-surface">Parse confidence</Label>
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
                <Label className="text-kp-on-surface">Proposed action</Label>
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
                      {formatEnumLabel(v)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-kp-on-surface">Resolution notes</Label>
              <textarea
                className={cn("mt-1 min-h-[72px] w-full rounded-md px-3 py-2 text-sm", fieldInput)}
                value={detail.resolutionNotes ?? ""}
                onChange={(e) => setDetail({ ...detail, resolutionNotes: e.target.value || null })}
              />
            </div>
          </div>
        ) : null}
      </BrandModal>
    </div>
  );
}
